"use strict";

parserFactory.register("systemtranslation.com", () => new SystemTranslationParser());

class SystemTranslationParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.eplisterfull ul");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.thumb");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "p.has-text-align-center");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content p:not(.has-text-align-center)")];
    }
}
