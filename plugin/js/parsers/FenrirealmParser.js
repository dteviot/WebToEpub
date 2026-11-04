"use strict";

parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmFetchErrorHandler extends FetchErrorHandler {
    constructor(chapterUrl) {
        super();
        this.chapterUrl = chapterUrl;
    }

    promptUserForRetry(url, wrapOptions, response, failError) {
        const promptResponse = response.status === 403
            ? { url: this.chapterUrl, status: response.status }
            : response;
        return super.promptUserForRetry(url, wrapOptions, promptResponse, failError);
    }
}

class FenrirealmParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 4000;
        this.chapters = new Map();
    }

    async getChapterUrls(dom) {
        return this.loadChapters(new URL(dom.baseURI));
    }

    async loadChapters(url) {
        const seriesPath = this.seriesPath(url);
        const apiUrl = new URL(`/api/new/v2${seriesPath}/chapters`, url).href;
        const { json: data } = await HttpClient.fetchJson(apiUrl);
        if (!Array.isArray(data)) {
            throw new Error("Fenrir Realm returned an invalid chapter list.");
        }
        return data.sort((a, b) => a.index - b.index).map(chapter => {
            const entry = this.chapterListEntry(chapter, seriesPath, url);
            this.chapters.set(entry.sourceUrl, entry);
            return entry;
        });
    }

    chapterListEntry(chapter, seriesPath, url) {
        if (!Number.isInteger(chapter.id) || !chapter.uuid || !chapter.slug) {
            throw new Error("Fenrir Realm returned invalid chapter identifiers.");
        }
        return {
            id: chapter.id,
            uuid: chapter.uuid,
            slug: chapter.slug,
            sourceUrl: new URL(`${seriesPath}/${encodeURIComponent(chapter.slug)}`, url).href,
            title: this.removeDuplicatedChapterPrefix(chapter.title || chapter.name || ""),
            isIncludeable: chapter.locked?.price === 0 &&
                Date.parse(chapter.locked.unlocked_at) <= Date.now()
        };
    }

    seriesPath(url) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] !== "series" || !parts[1]) {
            throw new Error(`Cannot identify the Fenrir Realm series from ${url.href}`);
        }
        return `/series/${parts[1]}`;
    }

    async fetchChapter(url) {
        const sourceUrl = this.normalizeChapterUrl(url);
        const chapter = await this.findChapter(sourceUrl);
        const token = await this.authorizeChapter(chapter);
        const response = await this.requestChapter(chapter);
        const content = await this.readChapterContent(response, chapter, token);
        return this.buildChapterDocument(url, chapter, response.json, content);
    }

    normalizeChapterUrl(url) {
        const chapterUrl = new URL(url);
        const path = chapterUrl.pathname;
        const chapterPath = path.endsWith("/") ? path.slice(0, -1) : path;
        return `${chapterUrl.origin}${chapterPath}`;
    }

    async findChapter(sourceUrl) {
        if (!this.chapters.has(sourceUrl)) {
            await this.loadChapters(new URL(sourceUrl));
            await this.rateLimitDelay();
        }
        const chapter = this.chapters.get(sourceUrl);
        if (!chapter) {
            throw new Error(`Fenrir Realm chapter not found: ${sourceUrl}`);
        }
        return chapter;
    }

    async authorizeChapter(chapter) {
        const apiUrl = new URL("/api/read-token", chapter.sourceUrl).href;
        const { json: authorization } = await this.fetchChapterJson(apiUrl, chapter.sourceUrl, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ chapter_id: chapter.uuid })
        });
        if (authorization?.active !== true || typeof authorization.token !== "string" || !authorization.token) {
            throw new Error(`Fenrir Realm reading authorization failed for ${chapter.title}`);
        }
        return authorization.token;
    }

    async requestChapter(chapter) {
        const url = new URL(chapter.sourceUrl);
        const apiUrl = new URL(`/api/new/v2${url.pathname}`, url).href;
        const result = await this.fetchChapterJson(apiUrl, chapter.sourceUrl, {
            credentials: "include",
            headers: { Accept: "application/json", "X-Accepts-Encrypted-Content": "3" }
        });
        const data = result.json;
        if (!data || data.id !== chapter.id) {
            throw new Error(`Fenrir Realm returned a different or invalid chapter for ${chapter.title}`);
        }
        return result;
    }

    async readChapterContent(result, chapter, token) {
        const data = result.json;
        if (data.content_format === "locked") {
            throw new Error(`Fenrir Realm chapter is locked: ${chapter.title}`);
        }
        const content = data.content_format === "encrypted"
            ? await this.decryptChapter(result, chapter, token)
            : this.readUnencryptedContent(data);
        if (typeof content !== "string" || !content.trim()) {
            throw new Error(`Fenrir Realm returned empty or invalid content for ${chapter.title}`);
        }
        return content;
    }

    readUnencryptedContent(data) {
        if (data.content_format !== "html" && data.content_format !== "text") {
            throw new Error(`Unsupported Fenrir Realm content format: ${data.content_format}`);
        }
        return data.content;
    }

    async decryptChapter(result, chapter, token) {
        const data = result.json;
        if (data.content_scheme !== "fragmented-v1") {
            throw new Error(`Unsupported Fenrir Realm encryption scheme: ${data.content_scheme}`);
        }
        // A chapter response can issue a replacement for the minted reading token.
        const readingToken = result.response.headers.get("x-read-token-issued") || token;
        try {
            return await this.decryptContent(data, readingToken);
        } catch {
            throw new Error(`Could not decrypt Fenrir Realm chapter: ${chapter.title}`);
        }
    }

    buildChapterDocument(url, chapter, data, content) {
        const newDoc = Parser.makeEmptyDocForContent(url);
        const title = newDoc.dom.createElement("h1");
        title.textContent = this.removeDuplicatedChapterPrefix(data.name || chapter.title);
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
            errorHandler: new FenrirealmFetchErrorHandler(chapterUrl)
        });
    }

    async decryptContent(data, token) {
        this.validateFragments(data.content);
        const permutation = await this.createFragmentPermutation(token, data.id, data.content.length);
        const ciphertext = this.restoreFragmentOrder(data.content, permutation);
        const payload = this.decodeEncryptedPayload(ciphertext);
        const key = await this.deriveContentKey(token, data.id);
        return this.decryptPayload(payload, key);
    }

    validateFragments(fragments) {
        if (!Array.isArray(fragments) || fragments.length === 0 ||
            !fragments.every(fragment => typeof fragment === "string")) {
            throw new Error("Invalid encrypted fragments.");
        }
    }

    async createFragmentPermutation(token, chapterId, fragmentCount) {
        const seed = await this.sha256(`${token}:${chapterId}:fr-frag-v1`);
        const state = this.createShuffleState(seed);
        const permutation = Array.from({ length: fragmentCount }, (unused, index) => index);
        // Fisher–Yates shuffle, using the same generator as the site's reader.
        for (let index = fragmentCount - 1; index > 0; --index) {
            const swapIndex = this.nextShuffleValue(state) % (index + 1);
            [permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]];
        }
        return permutation;
    }

    createShuffleState(seed) {
        const view = new DataView(seed);
        return Uint32Array.of(...[0, 4, 8, 12].map(offset => view.getUint32(offset, true)));
    }

    nextShuffleValue(state) {
        // xorshift128: bit operations must match the site's unsigned 32-bit arithmetic.
        const shifted = (state[0] ^ state[0] << 11) >>> 0;
        const mixed = (shifted ^ shifted >>> 8) >>> 0;
        const last = state[3];
        state[0] = state[1];
        state[1] = state[2];
        state[2] = last;
        state[3] = (last ^ last >>> 19 ^ mixed) >>> 0;
        return state[3];
    }

    restoreFragmentOrder(fragments, permutation) {
        const orderedFragments = new Array(fragments.length);
        fragments.forEach((fragment, index) => {
            orderedFragments[permutation[index]] = fragment;
        });
        return orderedFragments.join("");
    }

    decodeEncryptedPayload(ciphertext) {
        const bytes = Uint8Array.from(atob(ciphertext), char => char.charCodeAt(0));
        const ivLength = 12;
        const authenticationTagLength = 16;
        if (bytes.length <= ivLength + authenticationTagLength) {
            throw new Error("Invalid encrypted payload.");
        }
        return { iv: bytes.slice(0, ivLength), ciphertext: bytes.slice(ivLength) };
    }

    async deriveContentKey(token, chapterId) {
        const keyBytes = await this.sha256(`${token}:${chapterId}:fr-content-v1`);
        return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    }

    sha256(text) {
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    }

    async decryptPayload(payload, key) {
        const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: payload.iv }, key, payload.ciphertext);
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
        return (parts.length >= 2) && (parts[0].trim() === parts[1].trim())
            ? parts.slice(1).join(":")
            : titleText;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "[style*='width:1px']");
        util.removeChildElementsMatchingSelector(element, ".reader-attribution");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        const img = dom.querySelector(".main-area .flex-col div.lazy-image-wrapper img:nth-of-type(2)");
        return img?.src || null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
