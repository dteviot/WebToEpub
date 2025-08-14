"use strict";

parserFactory.register("rtd.moe", () => new RtdMoeParser());

class RtdMoeParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.wp-post-navigation, div.tags, table#amazon-polly-audio-table");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }
}
