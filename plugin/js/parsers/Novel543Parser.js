"use strict";

parserFactory.register("novel543.com", () => new Novel543Parser());

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

    extractLanguage() {
        return "zh";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    async fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    moreChapterTextUrl(dom) {
        let has2underscores = (s) => ((s.match(/_/g) || []).length === 2);
        let nextUrl = [...dom.querySelectorAll(".foot-nav a")].pop();
        return ((nextUrl != null) && has2underscores(nextUrl.href))
            ? nextUrl.href
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.intro")];
    }
}
