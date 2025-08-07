"use strict";

parserFactory.register("octopii.co", () => new OctopiiParser());

class OctopiiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.chapter-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("main h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".page-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, ".btn-show-more");
        return node;
    }
}
