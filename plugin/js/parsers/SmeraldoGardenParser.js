"use strict";

parserFactory.register("smeraldogarden.com", () => new SmeraldoGardenParser());

class SmeraldoGardenParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-group__list a")]
            .map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        return ({
            sourceUrl: link.href,
            title: link.textContent,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.story__identity-meta a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter__title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".story__thumbnail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.story__summary")];
    }

}