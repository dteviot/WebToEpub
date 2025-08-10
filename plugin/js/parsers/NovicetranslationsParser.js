"use strict";
parserFactory.register("novicetranslations.com", () => new NovicetranslationsParser());
class NovicetranslationsParser extends WordpressBaseParser {
    constructor() {
        super();
    }
    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.entry");
        return util.hyperlinksToChapterList(menu);
    }

    findCoverImageUrl(dom) { 
        return util.getFirstImgSrc(dom, "div.wp-block-image");
    }
}
