"use strict";

parserFactory.register("tomotranslations.com", () => new TomotranslationsParser());

class TomotranslationsParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("section.entry");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("section.entry");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.taxonomies");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }
}
