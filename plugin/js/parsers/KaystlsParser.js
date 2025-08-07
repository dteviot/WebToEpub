"use strict";

parserFactory.register("kaystls.site", () => new KaystlsParser());

class KaystlsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.wp-block-columns a.wp-block-navigation-item__content")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.wp-block-columns");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.wp-block-columns.alignwide h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, 
            "div.code-block, #nav_inner_page_backwards, #nav_inner_page_forwards, #message_content, .donate");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.wp-block-cover");
    }
}
