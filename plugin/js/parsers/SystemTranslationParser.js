"use strict";

parserFactory.register("systemtranslation.com", () => new SystemTranslationParser());

class SystemTranslationParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.wplp_listposts li.parent:not(.clone) div.top a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "p.has-text-align-center");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content p:not(.has-text-align-center)")];
    }
}
