"use strict";

parserFactory.register("rainofsnow.com", () => new RainOfSnowParser());

class RainOfSnowParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            RainOfSnowParser.extractPartialChapterList,
            RainOfSnowParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("div#chapter a:not(.page-numbers)")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll("ul.page-numbers a.page-numbers:not(.next)")]
            .map(a => a.href);
    }

    findContent(dom) {
        let content = dom.querySelector("div.zoomdesc-cont");
        util.fixDelayLoadedImages(content, "data-src");
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".container h2");
    }

    findChapterTitle(dom) {
        return dom.querySelector("li.menu-toc-current")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".imagboca1 img");
        return img?.getAttribute("data-src");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#synop")];
    }
}
