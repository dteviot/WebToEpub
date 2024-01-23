"use strict";

parserFactory.register("midnightrambles.in", () => new MidnightramblesParser());

class MidnightramblesParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("article");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".amp-wp-article-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".amp-wp-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".amp-wp-title");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".amp-wp-article-content amp-img")?.getAttribute("src") ?? null;
    }
}
