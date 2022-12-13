"use strict";

parserFactory.register("novelbin.com", () => new NovelbinParser());
parserFactory.register("novelbin.net", () => new NovelbinParser());

class NovelbinParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list-chapter");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#chr-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".desc-text")];
    }
}
