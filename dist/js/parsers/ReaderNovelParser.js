"use strict";

parserFactory.register("readernovel.net", () => new ReaderNovelParser());

class ReaderNovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-list-wrapper a")]
            .map(link => this.linkToChapter(link))
            .reverse();
    }

    linkToChapter(link) {
        let title = link.getAttribute("title");
        return ({
            sourceUrl:  link.href,
            title: title,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("div#chapter-container") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".page-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("li.list-group-item a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".manga-image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#collapseSummary")];
    }

}