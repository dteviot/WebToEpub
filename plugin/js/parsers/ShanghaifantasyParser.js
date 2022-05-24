"use strict";

parserFactory.register("shanghaifantasy.com", () => new ShanghaifantasyParser());

class ShanghaifantasyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.elementor-posts-container");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div[data-widget_type='theme-post-content.default']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".patreon1");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div[data-widget_type='image.default']");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[role='tablist'] p")];
    }
}
