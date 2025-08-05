"use strict";

//dead url/ parser
parserFactory.register("idnovel.my.id", () => new IdnovelmyidParser());

class IdnovelmyidParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.bxcl");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.text-left");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.infox h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "center");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.maincontent b");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.thumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script");
    }
}
