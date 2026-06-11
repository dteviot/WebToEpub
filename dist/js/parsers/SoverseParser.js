"use strict";

parserFactory.register("soverse.com", () => new SoverseParser());

class SoverseParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.chapter-list a")]
            .map(SoverseParser.linkToChapter)
            .reverse();
    }

    static linkToChapter(link) {
        link.querySelector("span.time").remove();
        return {
            sourceUrl:  link.href,
            title: link.textContent.trim()
        };        
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".single-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".pub-date, .chapter-nav, .china, #popupreport, .snpconainer, amp-selector");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".single-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".kepalanovel");
    }
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.info")];
    }
}
