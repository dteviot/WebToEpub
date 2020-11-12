"use strict";

parserFactory.register("ontimestory.eu", () => new OntimestoryParser());

class OntimestoryParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("article p a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.page-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.post-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.page-excerpt");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article p")]
            .filter(p => p.querySelector("a") === null);
    }
}
