"use strict";

parserFactory.register("woopread.com", () => new WoopreadParser());

class WoopreadParser extends Parser{
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-3xl");
    };

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.relative .text-text-secondary")];
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.mb-4:nth-of-type(4) a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.relative");
    };

    async getChapterUrls(dom) {
        const chapterLinks = [...dom.querySelectorAll("main.grow .notranslate .mt-8 .grid-cols-1 a")];
        const chapterTitles = [...dom.querySelectorAll("div.grow .line-clamp-1")];

        let chapterList = [];
        for (let i = 0; i < chapterLinks.length; i++) {
            chapterList.push({
                sourceUrl: chapterLinks[i].href,
                title: chapterTitles[i].textContent,
            });
        };

        return chapterList.reverse();
    }
    
    findChapterTitle(dom) {
        return dom.querySelector("h2.text-2xl");
    };

    findContent(dom) {
        return dom.querySelector("div[id^='chapter']");
    };
}
