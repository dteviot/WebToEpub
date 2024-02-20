"use strict";

parserFactory.register("wetriedtls.site", function () {return new WetriedParser();});

class WetriedParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div[role='tabpanel'] a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    findContent(dom) {
        return (
            dom.querySelector("#reader-container") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.w-full");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.p-5")];
    }
}
