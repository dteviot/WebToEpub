"use strict";

parserFactory.register("foxaholic.com", () => new FoxaholicParser());

class FoxaholicParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.page-content-listing a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description-summary")];
    }    
}
