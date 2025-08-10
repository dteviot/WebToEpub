"use strict";

parserFactory.register("rubymaybetranslations.com", () => new RubymaybetranslationsParser());

class RubymaybetranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("details a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".nv-page-title h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");    
    }

    findCoverImageUrl() {
        return null;
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingSelector(webPageDom, "#comments");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content > p")];
    }
}
