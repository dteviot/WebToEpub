"use strict";

parserFactory.register("asianhobbyist.com", () => new AsianHobbyistParser());

class AsianHobbyistParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.releases-wrap a")]
            .map(a => util.hyperLinkToChapter(a));
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".post-title.entry-title a");
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.code-block, div.osny-nightmode");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("header.page-header h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.thumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.details")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, ".btn");
    }    
}
