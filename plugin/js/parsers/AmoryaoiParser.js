"use strict";

parserFactory.register("amor-yaoi.com", () => new AmoryaoiParser());

class AmoryaoiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("#content a")]
            .filter(a => a.href.includes("&chapter="))
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "#jumpmenu, #pagelinks, #reviewform, #sort");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#output, blockquote")];
    }
}
