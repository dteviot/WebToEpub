"use strict";

parserFactory.register("gravitynovels.com", () => new GravityNovelsParser());

class GravityNovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("section#chapters a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return (
            dom.querySelector(".entry-content") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story__identity-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.chapter__title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure.story__thumbnail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section.story__summary")];
    }

}



