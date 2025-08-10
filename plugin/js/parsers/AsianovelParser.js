"use strict";

parserFactory.register("asianovel.net", () => new AsianovelParser());

class AsianovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-group__list a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".story__identity-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter__title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__summary")];
    }
}
