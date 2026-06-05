"use strict";

//dead url/ parser
parserFactory.register("sj.uukanshu.com", () => new SjuukanshuParser());

class SjuukanshuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#listCont .ml-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#bookContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.bookname");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-info");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc")];
    }
}
