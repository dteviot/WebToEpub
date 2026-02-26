"use strict";

parserFactory.register("aerialrain.com", () => new AerialrainParser());

class AerialrainParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.frame-links-list a")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.entry-content");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.blog-detail-description p")];
    }
}
