"use strict";

parserFactory.register("novelhall.com", () => new NovelhallParser());

class NovelhallParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let container = dom.querySelector("div.book-catalog") ||
            dom.querySelector("div.catalog") ||
            dom.querySelector("div.chapter-list") ||
            dom.querySelector("div.more-chapters") ||
            dom.querySelector("#more-chapters");
        let chapters = [];
        if (container) {
            chapters = [...container.querySelectorAll("a")]
                .map(a => util.hyperLinkToChapter(a));
        } else {
            chapters = [...dom.querySelectorAll("div.book-catalog")]
                .map(c => [...c.querySelectorAll("a")])
                .reduce((a, c) => a.length < c.length ? c : a, [])
                .map(a => util.hyperLinkToChapter(a));
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("article div.entry-content") ||
            dom.querySelector("div.entry-content") ||
            dom.querySelector("div.read-content") ||
            dom.querySelector("div.chapter-content") ||
            dom.querySelector("div.content") ||
            dom.querySelector("div#htmlContent") ||
            dom.querySelector("article");
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
        return dom.querySelector("article div.single-header h1") ||
            dom.querySelector("div.single-header h1") ||
            dom.querySelector("h1.single-header");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book-info div.intro")];
    }
}
