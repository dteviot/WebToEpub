"use strict";

parserFactory.register("mydramanovel.com", () => new MydramanovelParser());

class MydramanovelParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("#tdi_47 .td-module-thumb a,#tdi_54 h3.entry-title a")]
            .map(a => this.hyperLinkToChapter(a));
    }

    hyperLinkToChapter(link) {
        return {
            sourceUrl: link.href,
            title: link.getAttribute("title")
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
        let span = dom.querySelector(".td-module-thumb a span[data-img-url]");
        return span.getAttribute("data-img-url") ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.tdb_category_description .tdb-block-inner")];
    }
}
