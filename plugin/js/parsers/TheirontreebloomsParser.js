"use strict";

parserFactory.register("theirontreeblooms.com", () => new TheirontreebloomsParser());
parserFactory.register("theirontreeblooms.wordpress.com", () => new TheirontreebloomsParser());

class TheirontreebloomsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.article");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.content-holder");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.headline");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".sharedaddy, .post-meta, .post-navigation");
        super.removeUnwantedElementsFromContentElement(element);
    }
    
    findChapterTitle(dom) {
        return dom.querySelector("h1.headline");
    }    
}
