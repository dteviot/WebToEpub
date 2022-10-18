"use strict";

parserFactory.register("reaperscans.com", () => new ReaperscansParser());

class ReaperscansParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return ReaperscansParser.extractPartialChapterList(dom).reverse();
    }

    static extractPartialChapterList(dom) {
        let col = dom.querySelector(".max-w-6xl");
        return [...col.querySelectorAll("ul[role='list'] a")]
            .map(ReaperscansParser.linkToChapter);
    }

    static linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector("p").innerText.trim()
        });
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div[aria-label='card']");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("section.p-2 div.p-4")];
    }
}
