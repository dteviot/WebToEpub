"use strict";

parserFactory.register("wattpad.com", function() { return new WattpadParser(); });

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
        let storyId = WattpadParser.extractIdFromUrl(dom.baseURI);
        let chaptersUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`;
        let json = (await HttpClient.fetchJson(chaptersUrl)).json;
        return json.parts.map(p => ({sourceUrl: p.url, title: p.title}));
    }

    static extractIdFromUrl(url) {
        let path = new URL(url).pathname;
        return path.split("/").filter(s => s.includes("-"))[0].split("-")[0];
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
        return dom.querySelector("div[data-page-number]");
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
