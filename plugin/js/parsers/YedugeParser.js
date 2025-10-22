"use strict";

parserFactory.register("yeduge.com", () => new YedugeParser());

class YedugeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".chapter-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "lock");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info > p:nth-child(2)");
        return authorLabel?.textContent.replace("作者：", "").trim() ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".desc").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".novel")];
    }
}