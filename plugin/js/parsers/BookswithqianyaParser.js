"use strict";

parserFactory.register("bookswithqianya.com", () => new BookswithqianyaParser());

class BookswithqianyaParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.elementor-tab-content a")]
            .map(a => util.hyperLinkToChapter(a))
            .filter(c => this.isChapterUrl(c.sourceUrl));
    }

    isChapterUrl(url) {
        return !url.includes("/products/") 
            && !url.includes("/novels/")
            && !url.includes("myrics");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".elementor-image-box-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
