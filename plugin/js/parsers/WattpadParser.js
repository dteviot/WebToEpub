"use strict";

parserFactory.register("wattpad.com", () => new WattpadParser());

class WattpadImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    extractWrappingUrl(element) {
        let url = super.extractWrappingUrl(element);
        return this.removeSizeParamsFromQuery(url);
    }

    removeSizeParamsFromQuery(originalUrl) {
        let url = new URL(originalUrl);
        if (!url.hostname.toLowerCase().includes("wattpad")) {
            return originalUrl;
        }
        url.search = "";
        return url.href;
    }

    // Skip Wattpad UI images: icons, lock images, user avatars — not story content
    isImageUrlToSkip(url) {
        try {
            let parsed = new URL(url);
            let path = parsed.pathname.toLowerCase();
            // Skip icon images (lock.png, etc.)
            if (path.includes("/img/icons/")) return true;
            // Skip user profile/avatar URLs
            if (path.startsWith("/user/")) return true;
            // Skip Wattpad CDN images that are clearly UI assets
            if (path.includes("/wp-neutral") || path.includes("/wp-") && path.endsWith(".png") && path.includes("icon")) return true;
        } catch (e) {
            // ignore malformed URLs
        }
        return false;
    }

    initialUrlToTry(imageInfo) {
        let url = super.initialUrlToTry(imageInfo);
        return url;
    }

    async fetchImage(imageInfo, progressIndicator, parentPageUrl) {
        let url = this.initialUrlToTry(imageInfo);
        if (this.isImageUrlToSkip(url)) {
            progressIndicator();
            return;
        }
        return super.fetchImage(imageInfo, progressIndicator, parentPageUrl);
    }
}

class WattpadParser extends Parser {
    constructor() {
        super(new WattpadImageCollector());
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        if (menu == null) {
            return this.fetchChapterList(dom);
        }
        return util.hyperlinksToChapterList(menu);
    }

    async fetchChapterList(dom) {
        // Wattpad returns 400 for API calls from non-wattpad.com origins.
        // Instead, extract chapter list from the embedded JSON in the story page HTML.
        let parts = WattpadParser.extractPartsFromDom(dom);
        if (parts && parts.length > 0) {
            return parts.map(p => ({sourceUrl: p.url, title: p.title}));
        }

        // Fallback: try the API via proxy (proxy strips Origin/Referer so Wattpad accepts it)
        let storyId = WattpadParser.extractIdFromUrl(dom.baseURI);
        if (!storyId) {
            throw new Error(`Could not extract Wattpad story ID from URL: ${dom.baseURI}\nExpected a URL like wattpad.com/story/12345-story-name`);
        }
        let chaptersUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`;
        let json = (await HttpClient.fetchJson(chaptersUrl)).json;
        return json.parts.map(p => ({sourceUrl: p.url, title: p.title}));
    }

    static extractPartsFromDom(dom) {
        // Wattpad embeds a JSON blob in a <script> tag containing "parts":[...]
        for (let script of dom.querySelectorAll("script")) {
            let src = script.textContent || script.innerHTML || "";
            let idx = src.indexOf('"parts":[');
            if (idx === -1) continue;
            try {
                // Find the enclosing object by searching backwards for '{'
                // and extracting just the parts array
                let arrStart = src.indexOf("[", idx + 8);
                let depth = 0;
                let arrEnd = arrStart;
                for (let i = arrStart; i < src.length; i++) {
                    if (src[i] === "[" || src[i] === "{") depth++;
                    else if (src[i] === "]" || src[i] === "}") {
                        depth--;
                        if (depth === 0) { arrEnd = i; break; }
                    }
                }
                let partsJson = src.substring(arrStart, arrEnd + 1);
                return JSON.parse(partsJson);
            } catch (e) {
                // continue to next script tag
            }
        }
        return null;
    }

    static extractIdFromUrl(url) {
        let path;
        try {
            path = new URL(url).pathname;
        } catch (e) {
            path = url; // fallback if URL is malformed
        }
        let segments = path.split("/").filter(s => s.length > 0);

        // Priority 1: segment in "12345-story-name" format (most common Wattpad URL)
        let slugSeg = segments.find(s => /^\d+-/.test(s));
        if (slugSeg) return slugSeg.split("-")[0];

        // Priority 2: segment that is purely numeric (ID-only URL, e.g. /story/12345)
        let pureSeg = segments.find(s => /^\d+$/.test(s));
        if (pureSeg) return pureSeg;

        // Priority 3: any segment containing numbers followed by a dash (less strict)
        let anySeg = segments.find(s => s.includes("-") && /\d/.test(s));
        if (anySeg) return anySeg.split("-")[0];

        return null; // caller handles this
    }

    static isWattpadStoryUrl(url) {
        try {
            let hostname = new URL(url).hostname.toLowerCase();
            if (!hostname.endsWith("wattpad.com")) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return WattpadParser.extractIdFromUrl(url) != null;
    }

    static buildWpdMyDownloadUrl(storyId) {
        return `https://wpd.my/download/${storyId}?om=1&mode=story&format=epub`;
    }

    static parseFilenameFromContentDisposition(header) {
        if (util.isNullOrEmpty(header)) {
            return null;
        }
        let utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match) {
            return decodeURIComponent(utf8Match[1].trim());
        }
        let plainMatch = header.match(/filename="?([^";]+)"?/i);
        if (plainMatch) {
            return plainMatch[1].trim();
        }
        return null;
    }

    static isZipArchive(bytes) {
        return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B;
    }

    static async tryFetchDirectEpub(url) {
        let storyId = WattpadParser.extractIdFromUrl(url);
        if (!storyId) {
            return null;
        }
        let downloadUrl = WattpadParser.buildWpdMyDownloadUrl(storyId);
        let fetched = await WattpadParser.fetchEpubFromWpdMy(downloadUrl);
        if (!fetched) {
            return null;
        }
        let fileName = fetched.fileName || `wattpad-${storyId}.epub`;
        return {
            blob: fetched.blob,
            fileName: EpubPacker.addExtensionIfMissing(fileName)
        };
    }

    static getWpdMyProxyUrls() {
        // corsproxy.io allows cross-origin from GitHub Pages; try it before other proxies.
        let proxies = ["https://corsproxy.io/?key=ab3170e1&url="];
        if (typeof HttpClient === "undefined") {
            return proxies;
        }
        let seen = new Set(proxies);
        let addProxy = (proxyUrl) => {
            if (util.isNullOrEmpty(proxyUrl) || seen.has(proxyUrl)) {
                return;
            }
            seen.add(proxyUrl);
            proxies.push(proxyUrl);
        };
        addProxy(HttpClient.corsProxyUrl);
        if (Array.isArray(HttpClient.CORS_PROXIES)) {
            for (let proxy of HttpClient.CORS_PROXIES) {
                addProxy(proxy.url);
            }
        }
        return proxies;
    }

    static epubFromBinaryBuffer(buffer, response) {
        let bytes = new Uint8Array(buffer);
        if (!WattpadParser.isZipArchive(bytes)) {
            return null;
        }
        let fileName = null;
        if (response && typeof response.headers?.get === "function") {
            fileName = WattpadParser.parseFilenameFromContentDisposition(
                response.headers.get("content-disposition")
            );
        }
        return {
            blob: new Blob([buffer], { type: "application/epub+zip" }),
            fileName: fileName
        };
    }

    static async fetchEpubAttempt(downloadUrl, proxyUrl) {
        let fetchUrl = proxyUrl ? proxyUrl + encodeURIComponent(downloadUrl) : downloadUrl;
        let ctrl = new AbortController();
        let tid = setTimeout(() => ctrl.abort(), 45000);
        try {
            let response = await fetch(fetchUrl, {
                credentials: "omit",
                signal: ctrl.signal
            });
            clearTimeout(tid);
            if (!response.ok) {
                return null;
            }
            let buffer = await response.arrayBuffer();
            return WattpadParser.epubFromBinaryBuffer(buffer, response);
        } catch (err) {
            clearTimeout(tid);
            return null;
        }
    }

    static async fetchEpubFromWpdMy(downloadUrl) {
        let proxyUrls = WattpadParser.getWpdMyProxyUrls();
        let attempts = [];
        if (!(typeof window !== "undefined" && window.WTE_WEBSITE_MODE)) {
            attempts.push(null);
        }
        attempts = attempts.concat(proxyUrls);

        for (let proxyUrl of attempts) {
            let fetched = await WattpadParser.fetchEpubAttempt(downloadUrl, proxyUrl);
            if (fetched) {
                return fetched;
            }
        }

        if (typeof HttpClient === "undefined") {
            return null;
        }

        try {
            let result = await HttpClient.wrapFetch(downloadUrl, {
                responseHandler: new FetchBinaryResponseHandler(),
                errorHandler: new SilentFetchErrorHandler(),
                bypassDirectFetchFallback: true
            });
            if (result?.arrayBuffer) {
                return WattpadParser.epubFromBinaryBuffer(result.arrayBuffer, result.response);
            }
        } catch (err) {
            console.warn("[WattpadParser] wpd.my HttpClient proxy race failed:", err.message);
        }
        return null;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let extraUris = this.findURIsWithRestOfChapterContent(dom);
        return this.fetchAndAddExtraContentForChapter(dom, extraUris);
    }

    findURIsWithRestOfChapterContent(dom) {
        let info = { "pages" : 1 };
        let json = this.findJsonWithRestOfChapterUriInfo(dom);
        if (json != null) {
            info.pages = json.pages;
            info.refreshToken = json.text_url.refresh_token;
            let uri = json.text_url.text;
            let index = uri.indexOf("?");
            info.uriStart = uri.substring(0, index);
            info.uriEnd = uri.substring(index);
        }
        return info;
    }

    findJsonWithRestOfChapterUriInfo(dom) {
        let searchString = ".metadata\":{\"data\":";
        for (let s of [...dom.querySelectorAll("script")]) {
            let source = s.innerHTML;
            let index = source.indexOf(searchString);
            if (0 <= index) {
                return util.locateAndExtractJson(source, searchString);
            }
        }
    }

    async fetchAndAddExtraContentForChapter(dom, extraUris) {
        let extraContent = (await this.fetchExtraChapterContent(extraUris));
        this.addExtraContent(dom, extraContent);
        return WattpadParser.removeDuplicateParagraphs(dom);
    }

    async fetchExtraChapterContent(extraUris) {
        let extraContent = [];
        for (let page = 2; page <= extraUris.pages; ++page) {
            let text = (await this.fetchPage(extraUris, page));
            extraContent.push(text);
        }
        return extraContent;
    }

    async fetchPage(extraUris, page) {
        let retry = 4;
        while (0 <= --retry) {
            let url = `${extraUris.uriStart}-${page}${extraUris.uriEnd}`;
            try {
                let text = (await HttpClient.fetchText(url));
                return text;
            } catch (err) { 
                try {
                    let json = (await HttpClient.fetchJson(extraUris.refreshToken)).json;
                    if (!util.isNullOrEmpty(json.token)) {
                        extraUris.uriEnd = "?" + json.token;
                    }
                } catch (err) { 
                    // eslint-disable-line no-empty
                }
            }
        }

        throw new Error("Unable to fetch " + extraUris.uriStart);
    }

    addExtraContent(dom, extraContent) {
        let content = this.findContent(dom);
        if (!content) {
            // Fallback: append to body or documentElement if no content container found
            content = dom.querySelector("body") || dom.documentElement;
        }
        if (!content) return dom;
        for (let s of extraContent) {
            content.appendChild(this.toHtml(s));
        }
        return dom;
    }

    static removeDuplicateParagraphs(dom) {
        let s = new Set();
        for (let p of [...dom.querySelectorAll("p[data-p-id]")]) {
            let id = p.getAttribute("data-p-id");
            if (s.has(id)) {
                p.remove();
            } else {
                s.add(id);
            }
        }
        return dom;
    }

    toHtml(extraContent) {
        return util.sanitize("<div>" + extraContent + "</div>")
            .querySelector("div");
    }

    findContent(dom) {
        return dom.querySelector("div[data-page-number]") ||
            dom.querySelector("div.story-parts") ||
            dom.querySelector("div.content") ||
            dom.querySelector("article") ||
            dom.querySelector("main");
    }

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("div.story-info span.sr-only");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.af6dp a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div._9c7jH a")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.glL-c").textContent.trim();
    }

    // custom cleanup of content
    removeUnwantedElementsFromContentElement(element) {
        let keep = [...element.querySelectorAll("p")];
        util.removeElements([...element.children]);
        for (let e of keep) {
            element.appendChild(e);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h1.h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div[data-testid='cover']");
    }
}
