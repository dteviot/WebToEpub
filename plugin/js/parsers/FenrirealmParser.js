"use strict";

parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmFetchErrorHandler extends FetchErrorHandler {
    constructor(chapterUrl) {
        super();
        this.chapterUrl = chapterUrl;
    }

    promptUserForRetry(url, wrapOptions, response, failError) {
        if (response.status === 403) {
            response = { url: this.chapterUrl, status: response.status };
        }
        return super.promptUserForRetry(url, wrapOptions, response, failError);
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
        let seriesPath = this.seriesPath(url);
        let data = (await HttpClient.fetchJson(new URL("/api/new/v2" + seriesPath + "/chapters", url).href)).json;
        if (!Array.isArray(data)) {
            throw new Error("Fenrir Realm returned an invalid chapter list.");
        }
        return data.sort((a, b) => a.index - b.index).map(chapter => {
            if (!Number.isInteger(chapter.id) || !chapter.uuid || !chapter.slug) {
                throw new Error("Fenrir Realm returned invalid chapter identifiers.");
            }
            let entry = {
                id: chapter.id,
                uuid: chapter.uuid,
                slug: chapter.slug,
                sourceUrl: new URL(seriesPath + "/" + encodeURIComponent(chapter.slug), url).href,
                title: this.removeDuplicatedChapterPrefix(chapter.title || chapter.name || ""),
                isIncludeable: chapter.locked?.price === 0 &&
                    Date.parse(chapter.locked.unlocked_at) <= Date.now()
            };
            this.chapters.set(entry.sourceUrl, entry);
            return entry;
        });
    }

    seriesPath(url) {
        let parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] !== "series" || !parts[1]) {
            throw new Error("Cannot identify the Fenrir Realm series from " + url.href);
        }
        return "/series/" + parts[1];
    }

    async fetchChapter(url) {
        let chapterUrl = new URL(url);
        let sourceUrl = chapterUrl.origin + chapterUrl.pathname.replace(/\/$/, "");
        if (!this.chapters.has(sourceUrl)) {
            await this.loadChapters(chapterUrl);
            await this.rateLimitDelay();
        }
        let chapter = this.chapters.get(sourceUrl);
        if (!chapter) {
            throw new Error("Fenrir Realm chapter not found: " + url);
        }
        let authorization = (await this.fetchChapterJson(new URL("/api/read-token", url).href, sourceUrl, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ chapter_id: chapter.uuid })
        })).json;
        if (authorization?.active !== true || typeof authorization.token !== "string" || !authorization.token) {
            throw new Error("Fenrir Realm reading authorization failed for " + chapter.title);
        }
        await this.rateLimitDelay();
        let result = await this.fetchChapterJson(new URL("/api/new/v2" + new URL(sourceUrl).pathname, url).href, sourceUrl, {
            credentials: "include",
            headers: { Accept: "application/json", "X-Accepts-Encrypted-Content": "3" }
        });
        let data = result.json;
        if (!data || data.id !== chapter.id) {
            throw new Error("Fenrir Realm returned a different or invalid chapter for " + chapter.title);
        }
        if (data.content_format === "locked") {
            throw new Error("Fenrir Realm chapter is locked: " + chapter.title);
        }
        let content = data.content;
        if (data.content_format === "encrypted") {
            if (data.content_scheme !== "fragmented-v1") {
                throw new Error("Unsupported Fenrir Realm encryption scheme: " + data.content_scheme);
            }
            // A chapter response can issue a replacement for the minted reading token.
            let token = result.response.headers.get("x-read-token-issued") || authorization.token;
            try {
                content = await this.decryptContent(data, token);
            } catch {
                throw new Error("Could not decrypt Fenrir Realm chapter: " + chapter.title);
            }
        } else if (data.content_format !== "html" && data.content_format !== "text") {
            throw new Error("Unsupported Fenrir Realm content format: " + data.content_format);
        }
        if (typeof content !== "string" || !content.trim()) {
            throw new Error("Fenrir Realm returned empty or invalid content for " + chapter.title);
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
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
        if (!Array.isArray(data.content) || data.content.length === 0 ||
            !data.content.every(fragment => typeof fragment === "string")) {
            throw new Error("Invalid encrypted fragments.");
        }
        let encoder = new TextEncoder();
        let seed = await crypto.subtle.digest("SHA-256", encoder.encode(`${token}:${data.id}:fr-frag-v1`));
        let view = new DataView(seed);
        let state = Uint32Array.of(...[0, 4, 8, 12].map(offset => view.getUint32(offset, true)));
        let permutation = data.content.map((fragment, index) => index);
        // Match the reader's xorshift128 generator and Fisher–Yates shuffle.
        for (let i = permutation.length - 1; i > 0; --i) {
            let value = (state[0] ^ state[0] << 11) >>> 0;
            value = (value ^ value >>> 8) >>> 0;
            let last = state[3];
            state[0] = state[1];
            state[1] = state[2];
            state[2] = last;
            state[3] = (last ^ last >>> 19 ^ value) >>> 0;
            let j = state[3] % (i + 1);
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        let fragments = new Array(data.content.length);
        data.content.forEach((fragment, index) => { fragments[permutation[index]] = fragment; });
        let bytes = Uint8Array.from(atob(fragments.join("")), char => char.charCodeAt(0));
        if (bytes.length <= 28) {
            throw new Error("Invalid encrypted payload.");
        }
        let keyBytes = await crypto.subtle.digest("SHA-256", encoder.encode(`${token}:${data.id}:fr-content-v1`));
        let key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
        let plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
        return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".main-area > .container h1");
    }

    findChapterTitle(dom) {
        let titleText = dom.querySelector("h1, h2")?.textContent ?? "";
        return this.removeDuplicatedChapterPrefix(titleText);
    }

    removeDuplicatedChapterPrefix(titleText) {
        let parts = titleText.split(":");
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
        let img = dom.querySelector(".main-area .flex-col div.lazy-image-wrapper img:nth-of-type(2)");
        return img?.src || null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
