"use strict";

parserFactory.register("novelhall.com", () => new NovelhallParser());

class NovelhallParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.book-catalog")]
            .map(c => [...c.querySelectorAll("a")])
            .reduce((a, c) => a.length < c.length ? c : a, [])
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("article div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-info h1");
    }

    extractAuthor(dom) {
        let meta = dom.querySelector("meta[property='books:author']");
        if (meta !== null) {
            meta = meta.getAttribute("content");
        }
        return (meta === null) ? super.extractAuthor(dom) : meta;
    }

    findChapterTitle(dom) {
        return dom.querySelector("article div.single-header h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book-info div.intro")];
    }
}
