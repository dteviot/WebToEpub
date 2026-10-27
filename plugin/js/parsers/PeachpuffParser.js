"use strict";

parserFactory.register("peachpuff.in", () => new PeachpuffParser());

class PeachpuffParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".chapter-group__list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".tag-pill")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".story__summary").textContent.trim();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".story__header");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".category-post-dropdown-container, .code-block");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter__title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__summary")];
    }
}
