"use strict";

parserFactory.register("moonlightnovels.com", () => new MoonlightnovelsParser());

class MoonlightnovelsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = [...dom.querySelectorAll("div.elementor-posts-container")].pop();
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div[data-widget_type='theme-post-content.default']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.elementor-heading-title");
    }

    extractDescription(dom) {
        return dom.querySelector("meta[name='description']").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#content div.elementor-widget-image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[data-widget_type='text-editor.default'] p")];
    }
}
