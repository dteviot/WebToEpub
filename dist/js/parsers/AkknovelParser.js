"use strict";

parserFactory.register("akknovel.com", () => new AkknovelParser());

class AkknovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.chapter-item a")]
            .map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        let span = link.querySelector("span");
        let title = span.textContent.trim() + " " + span.nextSibling.textContent.trim();
        return ({
            sourceUrl:  link.href,
            title: title,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("#chr-content") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.aspect-h-4");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.leading-7")];
    }
}
