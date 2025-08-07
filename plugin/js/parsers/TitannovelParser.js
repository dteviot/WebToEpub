"use strict";

parserFactory.register("titannovel.net", () => new TitannovelParser());

class TitannovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".meta h1 a");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".meta span a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".jp-relatedposts");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#content-a")];
    }
}
