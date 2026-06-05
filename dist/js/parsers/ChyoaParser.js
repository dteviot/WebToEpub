"use strict";

parserFactory.register("chyoa.com", () => new ChyoaParser());

class ChyoaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.story-map-content a.title")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.layout-content-wrapper");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("story-map-header h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "footer, div.chyoa-adzone, " 
            + "div.ratings, div.links" );
        super.removeUnwantedElementsFromContentElement(element);
    }

    removeNextAndPreviousChapterHyperlinks() {
        // Don't remove next or previous links
        // This is a "choose your own story" like site
        // So user picks links to next chapters
    }
}
