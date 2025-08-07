"use strict";

parserFactory.register("karistudio.com", function() {return new KariStudioParser();});

class KariStudioParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.novel_index a")]
            .map(link => util.hyperLinkToChapter(link)).reverse();
    }

    findContent(dom) {
        return (
            dom.querySelector("article.small")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#novel_info_left");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc_div p")];
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".confuse, #novel_nav, .post-rating-wrapper, #donation-msg, .clearfix, .navigation, #font-options-bar");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
