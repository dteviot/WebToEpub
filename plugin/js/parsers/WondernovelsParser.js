"use strict";

parserFactory.register("wondernovels.com", () => new WondernovelsParser());

class WondernovelsParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.lcp_catlist a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".wpra-reactions-wrap, .saboxplugin-wrap, .cb_p6_patreon_button");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
