"use strict";

parserFactory.register("lightnovelreader.org", () => new LightnovelreaderParser());

class LightnovelreaderParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.js-load-chapters");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "p.display-hide");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.flex-1");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.flex-1 div.text-sm")];
    }
}
