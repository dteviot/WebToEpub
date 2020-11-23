"use strict";

parserFactory.register("dummynovels.com", () => new DummynovelsParser());

class DummynovelsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.bdt-accordion-container");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.elementor-widget-theme-post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return [...dom.querySelectorAll(".chapter-heading")].pop();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.site-content");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-synopsis-content")];
    }
}
