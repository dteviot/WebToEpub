"use strict";

parserFactory.register("mydramanovel.com", () => new MydramanovelParser());

class MydramanovelParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".td-big-grid-flex-posts .entry-title a, .tdb-category-loop-posts .entry-title a")]
            .map(a => this.hyperLinkToChapter(a));
    }

    hyperLinkToChapter(link) {
        return {
            sourceUrl: link.href,
            title: link.getAttribute("title") || link.textContent
        };
    }

    findContent(dom) {
        return dom.querySelector("div.td-post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tdb-title-text");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        let span = dom.querySelector(".td-big-grid-flex-posts .td-module-thumb span[data-img-url]");
        return span ? (span.getAttribute("data-img-url") ?? null) : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.tdb_category_description .tdb-block-inner")];
    }
}
