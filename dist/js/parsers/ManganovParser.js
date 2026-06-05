"use strict";

//dead url/ parser
parserFactory.register("manganov.com", () => new ManganovParser());

class ManganovParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = [...dom.querySelectorAll("ul.chapter-list-wrapper")].pop();
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.mn-novel-chapter-content-body, div.chapter-images");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.info h6.info-details");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.mt-1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section.mb-3.mt-2  p")];
    }
}
