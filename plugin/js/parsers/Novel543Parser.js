"use strict";

parserFactory.register("novel543.com", () => new Novel543Parser());
parserFactory.register("twbook.cc", () => new Novel543Parser());

class Novel543Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.baseURI;
        tocUrl += tocUrl.endsWith("/")
            ? "dir"
            : "/dir";
        let nextDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let menu = nextDom.querySelector("div.chaplist ul:nth-of-type(2)");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return dom.querySelector("p.meta a[href*='bookstack']")?.textContent?.trim();
    }

    extractLanguage() {
        return "zh";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    async fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    /**
     * @param { Document } dom 
     * @param { string } baseUrl 
     * @private
     */
    moreChapterTextUrl(dom, baseUrl) {
        /**
         * Extract chapter base from original URL (e.g., "8096_1" from "8096_1.html" or "8096_1_2.html")
         * 
         * @param { string  } url 
         */
        let getChapterBase = (url) => {
            let match = url.match(/\/(\d+_\d+)(?:_\d+)?\.html/);
            return match ? match[1] : null;
        };
        
        let baseChapter = getChapterBase(baseUrl);
        if (!baseChapter) return null;
        
        // Find the last link in foot-nav (next chapter link)
        let nextLink = /** @type { HTMLAnchorElement | undefined } */ ([...dom.querySelectorAll(".foot-nav a")].pop());
        if (!nextLink) return null;
        
        let nextUrl = nextLink.href;
        // Check if the next URL is a continuation of the same chapter
        // (e.g., 8096_1_2.html is a continuation of 8096_1.html)
        if (nextUrl.includes(`/${baseChapter}_`)) {
            return nextUrl;
        }
        return null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.intro")];
    }
}
