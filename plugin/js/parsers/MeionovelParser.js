"use strict";

parserFactory.register("meionovel.id", () => new MeionovelParser());

class MeionovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.listing-chapters_wrap ul.list-chap");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.reading-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-title h3");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div#text-chapter-toolbar");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        let breadcrumb = dom.querySelector("ol.breadcrumb li.active");
        return breadcrumb === null ? null : breadcrumb.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.post-content, .summary__content")];
    }
}
