"use strict";

parserFactory.register("untamedalley.com", () => new UntamedAlleyParser());

class UntamedAlleyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("p a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.hestia-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.wp-block-image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article p")]
            .filter(p => p.querySelector("a") === null);
    }
}
