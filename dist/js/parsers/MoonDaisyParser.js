"use strict";

parserFactory.register("moondaisyscans.biz", () => new MoonDaisyParser());

class MoonDaisyParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(this.linkToChapter)
            .reverse();
    }

    linkToChapter(link) {
        let title = MoonDaisyParser.extractChapterNum(link).trim();
        return ({
            sourceUrl:  link.href,
            title: title
        });
    }

    static extractChapterNum(link) {
        const chapternum = link.querySelector(".chapternum");
        return chapternum == null
            ? "[placeholder]"
            : chapternum.textContent;
    }

    findContent(dom) {
        return dom.querySelector("#readerarea");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".thumb");
    }

    getInformationEpubItemChildNodes(dom) {
        let info = dom.querySelector(".entry-content");
        return info == null
            ? []
            : [info];
    }
}
