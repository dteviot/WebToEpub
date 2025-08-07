"use strict";

parserFactory.register("peachpitting.com", () => new PeachpittingParser());

class PeachpittingParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.pt-cv-wrapper a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#wtr-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.elementor-heading-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".pp-multiple-authors-wrapper");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.post-title h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#primary");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.elementor-text-editor")].slice(1, 2);
    }
}
