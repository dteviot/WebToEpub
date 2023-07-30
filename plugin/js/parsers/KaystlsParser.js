"use strict";

parserFactory.register("kaystls.site", () => new KaystlsParser());

class KaystlsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.wp-block-columns a.wp-block-navigation-link__content")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.wp-block-columns");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.wp-block-columns.alignwide h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.wp-block-cover");
    }
}
