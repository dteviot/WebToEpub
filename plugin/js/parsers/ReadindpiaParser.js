"use strict";

parserFactory.register("readingpia.me", () => new ReadingpiaParser());

class ReadingpiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-list .chapter-item a.small-chapter-title")]
            .map(link => this.linkToChapter(link)).reverse();
    }

    linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.textContent,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("div#chapter-body") || dom.querySelector("div.chapter-body")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info-ans");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("p strong");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.seriesLeftSidebarDiv");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector(".card.mt-2")];
    }

}