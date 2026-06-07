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
        this.storyId = null;
        this.storyMetadata = null;
        this.storyPartHtml = null;
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        if (menu == null) {
            return this.fetchChapterList(dom);
        }
        return util.hyperlinksToChapterList(menu);
    }

    onStartCollecting() {
        super.onStartCollecting();
        let storyId = WattpadParser.extractIdFromUrl(this.state.chapterListUrl);
        if (storyId) {
            return this.ensureStoryCache(storyId);
        }
    }

    async loadEpubMetaInfo(dom) {
        let storyId = WattpadParser.extractIdFromUrl(dom.baseURI);
        if (storyId) {
            try {
                await this.ensureStoryCache(storyId);
            } catch (err) {
                console.warn("[WattpadParser] API metadata preload failed:", err.message);
            }
        }
    }

    async ensureStoryCache(storyId) {
        if (this.storyId === storyId && this.storyMetadata != null) {
            return;
        }
        this.storyId = storyId;
        this.storyMetadata = null;
        this.storyPartHtml = null;

        this.storyMetadata = await WattpadParser.fetchStoryMetadata(storyId);
        try {
            this.storyPartHtml = await WattpadParser.fetchStoryContentZip(storyId);
        } catch (err) {
            console.warn("[WattpadParser] story content zip unavailable, using per-chapter fallback:", err.message);
            this.storyPartHtml = null;
        }
    }

    async fetchChapterList(dom) {
        let storyId = WattpadParser.extractIdFromUrl(dom.baseURI);
        if (storyId) {
            try {
                await this.ensureStoryCache(storyId);
                if (this.storyMetadata?.parts?.length) {
                    let storyUrl = this.storyMetadata.url || dom.baseURI;
                    return this.storyMetadata.parts.map(part => ({
                        sourceUrl: WattpadParser.buildPartUrl(storyUrl, part.id),
                        title: part.title
                    }));
                }
            } catch (err) {
                console.warn("[WattpadParser] API chapter list failed:", err.message);
            }
        }

        // Fallback: embedded JSON in the story page HTML
        let parts = WattpadParser.extractPartsFromDom(dom);
        if (parts && parts.length > 0) {
            return parts.map(p => ({sourceUrl: p.url, title: p.title}));
        }

        if (!storyId) {
            throw new Error(`Could not extract Wattpad story ID from URL: ${dom.baseURI}\nExpected a URL like wattpad.com/story/12345-story-name`);
        }
        let json = (await HttpClient.fetchJson(WattpadParser.buildStoryApiUrl(storyId))).json;
        return json.parts.map(part => ({
            sourceUrl: WattpadParser.buildPartUrl(json.url || dom.baseURI, part.id),
            title: part.title
        }));
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

    static STORY_API_FIELDS = "tags,id,title,createDate,modifyDate,language(name),description,completed,mature,url,isPaywalled,user(username,avatar,description),parts(id,title),copyright";

    static buildStoryApiUrl(storyId) {
        return `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${WattpadParser.STORY_API_FIELDS}`;
    }

    static buildStoryContentZipUrl(storyId) {
        return `https://www.wattpad.com/apiv2/?m=storytext&group_id=${storyId}&output=zip`;
    }

    static buildPartUrl(storyUrl, partId) {
        try {
            let url = new URL(storyUrl);
            let base = url.origin + url.pathname.replace(/\/$/, "");
            return `${base}/part/${partId}`;
        } catch (e) {
            return `https://www.wattpad.com/part/${partId}`;
        }
    }

    static extractPartIdFromUrl(url) {
        try {
            let match = new URL(url).pathname.match(/\/part\/(\d+)/);
            if (match) {
                return match[1];
            }
        } catch (e) {
            let match = String(url).match(/\/part\/(\d+)/);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    static async fetchStoryMetadata(storyId) {
        let result = await HttpClient.fetchJson(WattpadParser.buildStoryApiUrl(storyId));
        let json = result?.json;
        if (json?.error_code === 1017) {
            throw new Error(`Wattpad story ${storyId} not found.`);
        }
        if (!json?.parts) {
            throw new Error(`Could not load Wattpad story metadata for ${storyId}.`);
        }
        return json;
    }

    static async fetchStoryContentZip(storyId) {
        let url = WattpadParser.buildStoryContentZipUrl(storyId);
        let result = await HttpClient.wrapFetch(url, {
            responseHandler: new FetchBinaryResponseHandler(),
            errorHandler: new SilentFetchErrorHandler(),
            bypassDirectFetchFallback: !!(typeof window !== "undefined" && window.WTE_WEBSITE_MODE)
        });
        if (!result?.arrayBuffer) {
            throw new Error("Empty Wattpad story content zip.");
        }
        return WattpadParser.parseStoryContentZip(result.arrayBuffer);
    }

    static async parseStoryContentZip(arrayBuffer) {
        if (typeof zip === "undefined") {
            throw new Error("zip.js is not loaded.");
        }
        let contentMap = new Map();
        let zipReader = new zip.ZipReader(
            new zip.BlobReader(new Blob([arrayBuffer])),
            { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) }
        );
        try {
            let entries = await zipReader.getEntries();
            for (let entry of entries) {
                if (entry.directory) {
                    continue;
                }
                let partId = entry.filename.replace(/\/$/, "");
                let html = await entry.getData(new zip.TextWriter());
                contentMap.set(partId, html);
            }
        } finally {
            await zipReader.close();
        }
        return contentMap;
    }

    static cleanTree(title, partId, body) {
        let originalDoc = new DOMParser().parseFromString(body, "text/html");
        let section = document.createElement("section");
        let heading = document.createElement("h2");
        heading.id = String(partId);
        heading.textContent = title || "";
        section.appendChild(heading);

        let bodyEl = originalDoc.body;
        if (!bodyEl) {
            return section;
        }

        for (let tag of [...bodyEl.children]) {
            if (tag.tagName?.toLowerCase() !== "p") {
                continue;
            }
            let style = tag.getAttribute("style");
            for (let child of [...tag.childNodes]) {
                if (child.nodeType === Node.TEXT_NODE
                    || ["B", "I", "U", "STRONG", "EM"].includes(child.nodeName)) {
                    let pTag = tag.cloneNode(true);
                    pTag.removeAttribute("class");
                    if (style) {
                        pTag.setAttribute("style", style);
                    }
                    section.appendChild(pTag);
                    break;
                }
                if (child.nodeName === "IMG") {
                    let imgTag = document.createElement("img");
                    imgTag.setAttribute("height", child.getAttribute("data-original-height") || "");
                    imgTag.setAttribute("width", child.getAttribute("data-original-width") || "");
                    imgTag.setAttribute("src", child.getAttribute("src") || "");
                    if (style) {
                        imgTag.setAttribute("style", style);
                    }
                    section.appendChild(imgTag);
                    break;
                }
                if (child.nodeName === "BR") {
                    let brTag = document.createElement("br");
                    if (style) {
                        brTag.setAttribute("style", style);
                    }
                    section.appendChild(brTag);
                    break;
                }
            }
        }
        return section;
    }

    static buildChapterDom(title, partId, body) {
        let section = WattpadParser.cleanTree(title, partId, body);
        let dom = new DOMParser().parseFromString("<!DOCTYPE html><html><body></body></html>", "text/html");
        let chapterTitle = dom.createElement("h1");
        chapterTitle.className = "h2";
        chapterTitle.textContent = title || "";
        dom.body.appendChild(chapterTitle);

        let content = dom.createElement("div");
        content.setAttribute("data-page-number", "1");
        while (section.firstChild) {
            content.appendChild(section.firstChild);
        }
        dom.body.appendChild(content);
        return dom;
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

    static decodeResponseText(bytes) {
        try {
            return new TextDecoder("utf-8").decode(bytes);
        } catch (e) {
            return "";
        }
    }

    static isWpdMyStoryNotFoundText(text) {
        if (util.isNullOrEmpty(text)) {
            return false;
        }
        let lower = text.toLowerCase();
        return lower.includes("does not exist") && lower.includes("deleted");
    }

    static isStoryNotFoundDom(dom) {
        if (!dom) {
            return false;
        }
        let text = dom.body?.textContent || dom.documentElement?.textContent || "";
        return WattpadParser.isWpdMyStoryNotFoundText(text);
    }

    static getLiveReaderUrl(storyUrl) {
        let isInsidePlugin = typeof window !== "undefined"
            && window.location.pathname.includes("/plugin/");
        let lrPath = isInsidePlugin ? "live-reader.html" : "plugin/live-reader.html";
        return lrPath + "?url=" + encodeURIComponent(storyUrl);
    }

    static inspectWpdMyResponse(buffer, response) {
        let bytes = new Uint8Array(buffer);
        if (WattpadParser.isZipArchive(bytes)) {
            return WattpadParser.epubFromBinaryBuffer(buffer, response);
        }
        if (WattpadParser.isWpdMyStoryNotFoundText(WattpadParser.decodeResponseText(bytes))) {
            return null;
        }
        return null;
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
            let buffer = await response.arrayBuffer();
            let inspected = WattpadParser.inspectWpdMyResponse(buffer, response);
            if (!response.ok) {
                return null;
            }
            return inspected;
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
                return WattpadParser.inspectWpdMyResponse(result.arrayBuffer, result.response);
            }
        } catch (err) {
            console.warn("[WattpadParser] wpd.my HttpClient proxy race failed:", err.message);
        }
        return null;
    }

    async fetchChapter(url) {
        let partId = WattpadParser.extractPartIdFromUrl(url);
        let storyId = this.storyId || WattpadParser.extractIdFromUrl(this.state?.chapterListUrl || url);
        if (partId && storyId) {
            try {
                await this.ensureStoryCache(storyId);
                let html = this.storyPartHtml?.get(String(partId));
                if (!util.isNullOrEmpty(html)) {
                    let title = this.storyMetadata?.parts?.find(part => String(part.id) === String(partId))?.title || "";
                    return WattpadParser.buildChapterDom(title, partId, html);
                }
            } catch (err) {
                console.warn("[WattpadParser] zip chapter load failed, falling back:", err.message);
            }
        }

        return this.fetchChapterFromPage(url);
    }

    async fetchChapterFromPage(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let extraUris = this.findURIsWithRestOfChapterContent(dom);
        if (extraUris.pages > 1) {
            await this.loadAllPagesFromApi(dom, extraUris);
        } else {
            await this.fetchAndAddExtraContentForChapter(dom, extraUris);
        }
        return WattpadParser.removeDuplicateParagraphs(dom);
    }

    async loadAllPagesFromApi(dom, extraUris) {
        let content = this.findContent(dom);
        if (!content) {
            return;
        }
        let parts = [];
        for (let page = 1; page <= extraUris.pages; ++page) {
            let pageUrl = WattpadParser.buildStoryTextPageUrl(extraUris, page);
            let text = await WattpadParser.fetchWattpadStoryTextPage(pageUrl);
            text = WattpadParser.normalizeStoryTextPayload(text);
            if (!util.isNullOrEmpty(text)) {
                parts.push(text);
            }
        }
        if (parts.length === 0) {
            return;
        }
        util.removeElements([...content.children]);
        let combinedNode = this.toHtml(parts.join(""));
        if (!combinedNode) {
            return;
        }
        while (combinedNode.firstChild) {
            content.appendChild(combinedNode.firstChild);
        }
    }

    findURIsWithRestOfChapterContent(dom) {
        let info = { pages: 1 };
        let json = this.findJsonWithRestOfChapterUriInfo(dom);
        if (json != null && json.text_url != null) {
            info.pages = json.pages || 1;
            info.refreshToken = json.text_url.refresh_token;
            let uri = json.text_url.text;
            if (uri.includes("/apiv2/") && uri.includes("m=storytext")) {
                info.apiStyle = "apiv2";
                info.textUrlBase = uri;
            } else {
                let index = uri.indexOf("?");
                info.uriStart = uri.substring(0, index);
                info.uriEnd = uri.substring(index);
            }
        }
        return info;
    }

    static buildStoryTextPageUrl(extraUris, page) {
        if (extraUris.apiStyle === "apiv2" && !util.isNullOrEmpty(extraUris.textUrlBase)) {
            return extraUris.textUrlBase + page;
        }
        return `${extraUris.uriStart}-${page}${extraUris.uriEnd}`;
    }

    static normalizeStoryTextPayload(text) {
        if (Array.isArray(text)) {
            return text.map(part => WattpadParser.normalizeStoryTextPayload(part)).join("");
        }
        if (typeof text !== "string") {
            return (text == null) ? "" : String(text);
        }
        let trimmed = text.trim();
        if (trimmed.startsWith("[")) {
            try {
                let parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.join("");
                }
            } catch (e) {
                // keep raw HTML/text payload
            }
        }
        return text;
    }

    static async decodeStoryTextBytes(bytes) {
        if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
            if (typeof DecompressionStream !== "undefined") {
                let stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
                let buffer = await new Response(stream).arrayBuffer();
                return new TextDecoder("utf-8").decode(buffer);
            }
        }
        return new TextDecoder("utf-8").decode(bytes);
    }

    static async fetchWattpadStoryTextPage(pageUrl) {
        let result = await HttpClient.wrapFetch(pageUrl, {
            responseHandler: new FetchBinaryResponseHandler(),
            errorHandler: new SilentFetchErrorHandler(),
            bypassDirectFetchFallback: !!(typeof window !== "undefined" && window.WTE_WEBSITE_MODE)
        });
        if (!result?.arrayBuffer) {
            return "";
        }
        let decoded = await WattpadParser.decodeStoryTextBytes(new Uint8Array(result.arrayBuffer));
        return WattpadParser.normalizeStoryTextPayload(decoded);
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
            let url = WattpadParser.buildStoryTextPageUrl(extraUris, page);
            try {
                let text = await WattpadParser.fetchWattpadStoryTextPage(url);
                if (!util.isNullOrEmpty(text)) {
                    return text;
                }
                text = (await HttpClient.fetchText(url));
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

        throw new Error("Unable to fetch " + WattpadParser.buildStoryTextPageUrl(extraUris, page));
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
        extraContent = WattpadParser.normalizeStoryTextPayload(extraContent);
        if (util.isNullOrEmpty(extraContent)) {
            return null;
        }
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
        if (this.storyMetadata?.title) {
            let el = dom.createElement("span");
            el.textContent = this.storyMetadata.title;
            return el;
        }
        return dom.querySelector("div.story-info span.sr-only");
    }

    extractAuthor(dom) {
        if (this.storyMetadata?.user?.username) {
            return this.storyMetadata.user.username;
        }
        let authorLabel = dom.querySelector("div.af6dp a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        if (Array.isArray(this.storyMetadata?.tags) && this.storyMetadata.tags.length > 0) {
            return this.storyMetadata.tags.join(", ");
        }
        let tags = ([...dom.querySelectorAll("div._9c7jH a")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        if (!util.isNullOrEmpty(this.storyMetadata?.description)) {
            return this.storyMetadata.description.trim();
        }
        let el = dom.querySelector("div.glL-c");
        return el?.textContent?.trim() ?? "";
    }

    // custom cleanup of content — keep paragraphs, images, and line breaks (WattpadDownloader parity)
    removeUnwantedElementsFromContentElement(element) {
        let keep = [...element.querySelectorAll("p, img, br")];
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
        if (!util.isNullOrEmpty(this.storyMetadata?.cover)) {
            return this.storyMetadata.cover.replace("-256-", "-512-");
        }
        return util.getFirstImgSrc(dom, "div[data-testid='cover']");
    }
}
