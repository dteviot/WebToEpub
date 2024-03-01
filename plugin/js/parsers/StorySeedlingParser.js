"use strict";

parserFactory.register("storyseedling.com", () => new StorySeedlingParser());

class StorySeedlingParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".grid.w-full a")]
            .map(link => this.linkToChapter(link))
            .reverse();
    }

    linkToChapter(link) {
        let title = link.querySelector(".truncate").textContent;
        return ({
            sourceUrl:  link.href,
            title: title,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("div.mx-auto .mb-4") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.leading-7 a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".truncate");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div[x-data]");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.order-2.mb-4")];
    }

}



