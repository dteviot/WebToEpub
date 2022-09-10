"use strict";

parserFactory.register("woopread.com", () => new WoopreadParser());

class WoopreadParser extends Parser{
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-title h1");
    };

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description-summary")];
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    };

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.version-chap");
        return util.hyperlinksToChapterList(menu).reverse();
    };
    
    findChapterTitle(dom) {
        return dom.querySelector("h3");
    };

    findContent(dom) {
        return dom.querySelector("div.text-left");
    };
}
