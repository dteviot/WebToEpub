"use strict";

parserFactory.register("cangji.net", () => new CangjiParser());

class CangjiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.walkTocPages(dom, 
            CangjiParser.chaptersFromDom, 
            CangjiParser.nextTocPageUrl, 
            chapterUrlsUI
        ));
    }

    static chaptersFromDom(dom) {
        return [...dom.querySelectorAll("#content .entry-title a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static nextTocPageUrl(dom) {
        let link = dom.querySelector("a.next");
        return link === null ? null : link.href;
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.archive-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".post-tags, .wp-block-ugb-container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.post-img");
    }
}
