"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).endsWith("foxaholic.com")),
    () => new FoxaholicParser()
);

class FoxaholicParser extends WordpressBaseParser {
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

    findChapterTitle(dom) {
        let title = dom.querySelector("ol.breadcrumb li.active");
        return (title === null) 
            ? dom.querySelector(".item-title")
            : title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description-summary")];
    }    
}
