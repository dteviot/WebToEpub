"use strict";

parserFactory.register("mangakakalot.com", () => new MangakakalotParser());

class MangakakalotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chaptersElement = dom.querySelector("div#chapter");
        return Promise.resolve(util.hyperlinksToChapterList(chaptersElement).reverse());
    }

    findContent(dom) {
        return dom.querySelector("div#vungdoc");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.manga-info-top h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("ul.manga-info-text a[href*='search_author']");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.manga-info-pic");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("ul.manga-info-text, div#noidungm")];
    }
}
