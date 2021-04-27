"use strict";

parserFactory.register("cangji.net", () => new CangjiParser());

class CangjiParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.walkTocPages(dom, 
            CangjiParser.chaptersFromDom, 
            CangjiParser.nextTocPageUrl, 
            chapterUrlsUI
        )).reverse();
    }

    static chaptersFromDom(dom) {
        return [...dom.querySelectorAll("div.sp-col-12 .entry-title a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static nextTocPageUrl(dom) {
        let link = dom.querySelector(".zlotus-pagination .older a")
        return link === null ? null : link.href;
    }

    findContent(dom) {
        return dom.querySelector("div.post-entry");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-header .entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".post-tags, .wp-block-ugb-container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.post-header .entry-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.post-img");
    }
}
