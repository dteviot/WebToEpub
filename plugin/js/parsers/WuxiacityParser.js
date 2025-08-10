"use strict";

parserFactory.register("wuxia.city", () => new WuxiacityParser());

class WuxiacityParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (!dom.baseURI.endsWith("/table-of-contents")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI + "/table-of-contents")).responseXML;
        }
        return [...dom.querySelectorAll("ul.chapters a")]
            .reverse()
            .map(WuxiacityParser.linkToChapter);
    }

    static linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector(".chapter-name").textContent.replace(/\n/g, " ")
        });
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-name");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title p").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book-synopsis")];
    }
}
