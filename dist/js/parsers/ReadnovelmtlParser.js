"use strict";

parserFactory.register("readnovelmtl.com", () => new ReadnovelmtlParser());

class ReadnovelmtlParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".accordion");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".card-body");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".mb-4 p")];
    }
}
