"use strict";

parserFactory.register("ddxs.com", () => new DdxsParser());

class DdxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("table:nth-of-type(2) tr a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#contents");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("dd h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".pic");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".intro")];
    }
}
