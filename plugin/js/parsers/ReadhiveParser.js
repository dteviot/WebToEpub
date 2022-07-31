"use strict";

parserFactory.register("readhive.org", () => new ReadhiveParser());

class ReadhiveParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.grid-in-content a")]
            .map(ReadhiveParser.linkToChapter)
            .reverse();
    }

    static linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector("p").textContent.trim(),
        });
    }

    findContent(dom) {
        return [...dom.querySelectorAll("#main  > div.justify-center")][1];
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.grid-in-art");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.prose p")];
    }
}
