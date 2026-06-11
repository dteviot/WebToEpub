"use strict";

parserFactory.register("hiscension.com", () => new HiscensionParser());

class HiscensionParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("table.wp-block-table td a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("div.blog-post-single-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("article h1");
    }
}
