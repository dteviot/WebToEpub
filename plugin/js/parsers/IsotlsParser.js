"use strict";

parserFactory.register("isotls.com", () => new IsotlsParser());

class IsotlsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("header h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "header, nav, footer");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.title;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "section.project-information");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section.project-information > div")];
    }
}
