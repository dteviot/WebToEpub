"use strict";

parserFactory.register("xiaxuenovels.xyz", () => new XiaxuenovelsParser());

class XiaxuenovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.sp-body a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.post-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".cb_p6_patreon_button, "+
            ".jp-relatedposts, xiaxu-after-content");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".entry-content");
    }    
}
