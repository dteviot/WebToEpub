"use strict";
parserFactory.register("novicetranslations.com", () => new NovicetranslationsParser());
class NovicetranslationsParser extends Parser{
    constructor() {
        super();
    }
    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.entry");
        return util.hyperlinksToChapterList(menu);
    }
    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }
    extractTitleImpl(dom) {
        return dom.querySelector("titel");
    }
    findChapterTitle(dom) {
        return dom.querySelector("h2.entry-title");
    }
    findCoverImageUrl(dom) { 
        return util.getFirstImgSrc(dom, "div.wp-block-image");
    }
}
