"use strict";

//dead url/ parser
parserFactory.register("czbooks.net", () => new CzbooksParser());

class CzbooksParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.chapter-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-detail .title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".novel-detail span.author a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".name");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel-detail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".description")];
    }
}
