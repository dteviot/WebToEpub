"use strict";

parserFactory.register("dummynovels.com", () => new DummynovelsParser());

class DummynovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.chapter-arc-accordion p a")]
            .map(link => ({
                sourceUrl:  link.href,
                title: link.querySelector("label").innerText.trim(),            
            }));
    }

    findContent(dom) {
        return dom.querySelector(".elementor-widget-theme-post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".elementor-heading-title");
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

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script, iframe, .code-block");
    }    
}
