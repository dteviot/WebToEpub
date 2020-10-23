"use strict";

parserFactory.register("translatinotaku.net", () => new TranslatinotakuParser());

class TranslatinotakuParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.list-group a")]
            .map(TranslatinotakuParser.linkToChapter);
    }

    static linkToChapter(link) {
        let text = link.querySelector("h3");
        for(let e of text.querySelectorAll("small")) {
            e.remove();
        }
        return {
            sourceUrl:  link.href,
            title: text.textContent,
            newArc: null
        };
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.display-entry");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.display-page");
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.entry-header");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content")];
    }
}
