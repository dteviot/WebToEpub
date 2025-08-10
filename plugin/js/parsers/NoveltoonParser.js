"use strict";

parserFactory.register("noveltoon.mobi", () => new NoveltoonParser());

class NoveltoonParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("a.episodes-info-a-item")]
            .map(a => NoveltoonParser.ToChapterInfo(a));
    }

    static ToChapterInfo(link) {
        let title = link.querySelector(".episode-item-num").textContent.trim()
            + " " + link.querySelector(".episode-item-title").textContent.trim();
        return {
            sourceUrl: link.href,
            title: title,
        };
    }

    findContent(dom) {
        return dom.querySelector("div.watch-chapter-detail");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.detail-title");
    }

    extractAuthor(dom) {
        return dom.querySelector("p.detail-author")?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("p.watch-chapter-title")?.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.detail-top-right");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.detail-desc")];
    }
}
