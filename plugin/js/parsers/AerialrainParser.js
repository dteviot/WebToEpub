"use strict";

parserFactory.register("aerialrain.com", () => new AerialrainParser());

class AerialrainParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.arconix-toggle-content a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.blog-detail-description");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.blog-detail-description p")];
    }
}
