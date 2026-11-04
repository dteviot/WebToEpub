"use strict";

parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmFetchErrorHandler extends FetchErrorHandler {
    constructor(chapterUrl) {
        super();
        this.chapterUrl = chapterUrl;
    }

    promptUserForRetry(url, wrapOptions, response, failError) {
        // Turnstile runs on the chapter page, not the API endpoint. But we change only
        // the link shown to the user and keep the url so Retry repeats the API request.
        const needsChapterPageForChallenge = response.status === 403;
        const promptResponse = needsChapterPageForChallenge
            ? { url: this.chapterUrl, status: response.status }
            : response;
        return super.promptUserForRetry(
            url,
            wrapOptions,
            promptResponse,
            failError,
        );
    }
}

class FenrirealmParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 4000;
        this.chaptersByUrl = new Map();
    }

    async getChapterUrls(dom) {
        return this.loadAndCacheChapterList(new URL(dom.baseURI));
    }

    async loadAndCacheChapterList(url) {
        const seriesPath = this.seriesPath(url);
        const apiUrl = new URL(`/api/new/v2${seriesPath}/chapters`, url).href;
        const { json: data } = await HttpClient.fetchJson(apiUrl);
        if (!Array.isArray(data)) {
            throw new Error("Fenrir Realm returned an invalid chapter list.");
        }
        return data
            // Chapter indexes restart within each volume.
            .sort((a, b) =>
                (a.group?.index ?? 0) - (b.group?.index ?? 0) ||
                a.index - b.index,
            )
            .map((apiChapter) => {
                const entry = this.buildChapterListEntry(
                    apiChapter,
                    seriesPath,
                    url,
                );
                this.chaptersByUrl.set(entry.sourceUrl, entry);
                return entry;
            });
    }

    buildChapterListEntry(apiChapter, seriesPath, url) {
        if (
            !Number.isInteger(apiChapter.id) ||
            !apiChapter.uuid ||
            !apiChapter.slug
        ) {
            throw new Error(
                "Fenrir Realm returned invalid chapter identifiers.",
            );
        }
        const isFree = apiChapter.locked?.price === 0;
        // Leave paid and unreleased chapters unchecked to avoid failed downloads.
        const isFreeAndReleased =
            isFree && Date.parse(apiChapter.locked.unlocked_at) <= Date.now();
        return {
            // Numeric id validates responses and derives decryption keys.
            // uuid identifies the same chapter when requesting authorization.
            id: apiChapter.id,
            uuid: apiChapter.uuid,
            slug: apiChapter.slug,
            sourceUrl: new URL(
                `${seriesPath}/${encodeURIComponent(apiChapter.slug)}`,
                url,
            ).href,
            title: this.removeDuplicatedChapterPrefix(
                apiChapter.title || apiChapter.name || "",
            ),
            isIncludeable: isFreeAndReleased,
        };
    }

    seriesPath(url) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] !== "series" || !parts[1]) {
            throw new Error(
                `Cannot identify the Fenrir Realm series from ${url.href}`,
            );
        }
        return `/series/${parts[1]}`;
    }

    async fetchChapter(url) {
        const chapterCacheKey = this.chapterCacheKeyFromUrl(url);
        const chapter = await this.getOrLoadChapter(chapterCacheKey);
        // Authorization sets the fr_read cookie used by the content request.
        // The returned token is also needed locally to decrypt the response.
        const decryptionToken = await this.authorizeChapter(chapter);
        const chapterResult = await this.requestChapter(chapter);
        const content = await this.readChapterContent(
            chapterResult,
            chapter,
            decryptionToken,
        );
        return this.buildChapterDocument(
            url,
            chapter,
            chapterResult.json,
            content,
        );
    }

    chapterCacheKeyFromUrl(url) {
        const chapterUrl = new URL(url);
        const path = chapterUrl.pathname;
        const chapterPath = path.endsWith("/") ? path.slice(0, -1) : path;
        return `${chapterUrl.origin}${chapterPath}`;
    }

    async getOrLoadChapter(sourceUrl) {
        if (!this.chaptersByUrl.has(sourceUrl)) {
            await this.loadAndCacheChapterList(new URL(sourceUrl));
            // A cache miss adds a TOC request and we throttle before authorizing.
            await this.rateLimitDelay();
        }
        const chapter = this.chaptersByUrl.get(sourceUrl);
        if (!chapter) {
            throw new Error(`Fenrir Realm chapter not found: ${sourceUrl}`);
        }
        return chapter;
    }

    async authorizeChapter(chapter) {
        const apiUrl = new URL("/api/read-token", chapter.sourceUrl).href;
        const { json: authorization } = await this.fetchChapterJson(
            apiUrl,
            chapter.sourceUrl,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ chapter_id: chapter.uuid }),
            },
        );
        if (
            authorization?.active !== true ||
            typeof authorization.token !== "string" ||
            !authorization.token
        ) {
            throw new Error(
                `Fenrir Realm reading authorization failed for ${chapter.title}`,
            );
        }
        return authorization.token;
    }

    async requestChapter(chapter) {
        const url = new URL(chapter.sourceUrl);
        const apiUrl = new URL(`/api/new/v2${url.pathname}`, url).href;
        // Match the site's reader capability header to receive encrypted content.
        const readerEncryptedContentCapability = "3";
        const result = await this.fetchChapterJson(apiUrl, chapter.sourceUrl, {
            credentials: "include",
            headers: {
                Accept: "application/json",
                "X-Accepts-Encrypted-Content": readerEncryptedContentCapability,
            },
        });
        const data = result.json;
        if (!data || data.id !== chapter.id) {
            throw new Error(
                `Fenrir Realm returned a different or invalid chapter for ${chapter.title}`,
            );
        }
        return result;
    }

    async readChapterContent(result, chapter, token) {
        const data = result.json;
        if (data.content_format === "locked") {
            throw new Error(`Fenrir Realm chapter is locked: ${chapter.title}`);
        }
        const content =
            data.content_format === "encrypted"
                ? await this.decryptChapter(result, chapter, token)
                : this.readUnencryptedContent(data);
        if (typeof content !== "string" || !content.trim()) {
            throw new Error(
                `Fenrir Realm returned empty or invalid content for ${chapter.title}`,
            );
        }
        return content;
    }

    readUnencryptedContent(data) {
        if (data.content_format !== "html" && data.content_format !== "text") {
            throw new Error(
                `Unsupported Fenrir Realm content format: ${data.content_format}`,
            );
        }
        return data.content;
    }

    async decryptChapter(result, chapter, token) {
        const data = result.json;
        if (data.content_scheme !== "fragmented-v1") {
            throw new Error(
                `Unsupported Fenrir Realm encryption scheme: ${data.content_scheme}`,
            );
        }
        // A chapter response can issue a replacement for the minted reading token.
        const readingToken =
            result.response.headers.get("x-read-token-issued") || token;
        try {
            return await this.decryptFragmentedV1Content(data, readingToken);
        } catch {
            throw new Error(
                `Could not decrypt Fenrir Realm chapter: ${chapter.title}`,
            );
        }
    }

    buildChapterDocument(url, chapter, data, content) {
        const newDoc = Parser.makeEmptyDocForContent(url);
        const title = newDoc.dom.createElement("h1");
        title.textContent = this.removeDuplicatedChapterPrefix(
            data.name || chapter.title,
        );
        newDoc.content.appendChild(title);
        if (data.content_format === "text") {
            Parser.addTextToChapterContent(newDoc, content);
        } else {
            util.moveChildElements(util.sanitize(content).body, newDoc.content);
        }
        return newDoc.dom;
    }

    fetchChapterJson(url, chapterUrl, fetchOptions) {
        return HttpClient.wrapFetchImpl(url, {
            fetchOptions: fetchOptions,
            responseHandler: new FetchJsonResponseHandler(),
            errorHandler: new FenrirealmFetchErrorHandler(chapterUrl),
        });
    }

    async decryptFragmentedV1Content(apiChapter, token) {
        this.validateFragments(apiChapter.content);
        const originalPositions = await this.createFragmentPermutation(
            token,
            apiChapter.id,
            apiChapter.content.length,
        );
        const encodedPayload = this.restoreFragmentOrder(
            apiChapter.content,
            originalPositions,
        );
        const payload = this.decodeEncryptedPayload(encodedPayload);
        const key = await this.deriveContentKey(token, apiChapter.id);
        return this.decryptPayload(payload, key);
    }

    validateFragments(fragments) {
        if (
            !Array.isArray(fragments) ||
            fragments.length === 0 ||
            !fragments.every((fragment) => typeof fragment === "string")
        ) {
            throw new Error("Invalid encrypted fragments.");
        }
    }

    async createFragmentPermutation(token, chapterId, fragmentCount) {
        const seed = await this.sha256(`${token}:${chapterId}:fr-frag-v1`);
        const state = this.createShuffleState(seed);
        const permutation = Array.from(
            { length: fragmentCount },
            (unused, index) => index,
        );
        // Fisher–Yates shuffle, using the same generator as the site's reader.
        for (let index = fragmentCount - 1; index > 0; --index) {
            const swapIndex = this.nextShuffleValue(state) % (index + 1);
            [permutation[index], permutation[swapIndex]] = [
                permutation[swapIndex],
                permutation[index],
            ];
        }
        return permutation;
    }

    createShuffleState(seed) {
        const view = new DataView(seed);
        // Match the reader's first four little-endian 32-bit words exactly;
        // a different byte order would produce the wrong fragment positions.
        const littleEndian = true;
        return Uint32Array.of(
            view.getUint32(0, littleEndian),
            view.getUint32(4, littleEndian),
            view.getUint32(8, littleEndian),
            view.getUint32(12, littleEndian),
        );
    }

    nextShuffleValue(state) {
        // xorshift128: bit operations must match the site's unsigned 32-bit arithmetic.
        const shifted = (state[0] ^ (state[0] << 11)) >>> 0;
        const mixed = (shifted ^ (shifted >>> 8)) >>> 0;
        const last = state[3];
        state[0] = state[1];
        state[1] = state[2];
        state[2] = last;
        state[3] = (last ^ (last >>> 19) ^ mixed) >>> 0;
        return state[3];
    }

    restoreFragmentOrder(fragments, originalPositions) {
        const orderedFragments = new Array(fragments.length);
        // The reader maps received positions to original positions, not vice versa.
        // For example, [2, 0, 1] restores received [C, A, B] to [A, B, C].
        fragments.forEach((fragment, receivedIndex) => {
            const originalIndex = originalPositions[receivedIndex];
            orderedFragments[originalIndex] = fragment;
        });
        return orderedFragments.join("");
    }

    decodeEncryptedPayload(encodedPayload) {
        const bytes = Uint8Array.from(atob(encodedPayload), (char) =>
            char.charCodeAt(0),
        );
        // fragmented-v1 layout: [12-byte IV][ciphertext][16-byte authentication tag].
        const ivLength = 12;
        const authenticationTagLength = 16;
        if (bytes.length <= ivLength + authenticationTagLength) {
            throw new Error("Invalid encrypted payload.");
        }
        // Web Crypto verifies the tag as part of decryption, so keep it appended.
        return {
            iv: bytes.slice(0, ivLength),
            ciphertextWithTag: bytes.slice(ivLength),
        };
    }

    async deriveContentKey(token, chapterId) {
        const keyBytes = await this.sha256(
            `${token}:${chapterId}:fr-content-v1`,
        );
        return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
            "decrypt",
        ]);
    }

    sha256(text) {
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    }

    async decryptPayload(payload, key) {
        const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: payload.iv },
            key,
            payload.ciphertextWithTag,
        );
        return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".main-area > .container h1");
    }

    findChapterTitle(dom) {
        const titleText = dom.querySelector("h1, h2")?.textContent ?? "";
        return this.removeDuplicatedChapterPrefix(titleText);
    }

    removeDuplicatedChapterPrefix(titleText) {
        const parts = titleText.split(":");
        return parts.length >= 2 && parts[0].trim() === parts[1].trim()
            ? parts.slice(1).join(":")
            : titleText;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(
            element,
            "[style*='width:1px']",
        );
        util.removeChildElementsMatchingSelector(
            element,
            ".reader-attribution",
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        const img = dom.querySelector(
            ".main-area .flex-col div.lazy-image-wrapper img:nth-of-type(2)",
        );
        return img?.src || null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
