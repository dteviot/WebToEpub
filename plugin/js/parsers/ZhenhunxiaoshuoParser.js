"use strict";

parserFactory.register("zhenhunxiaoshuo.com", () => new ZhenhunxiaoshuoParser());

class ZhenhunxiaoshuoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.excerpts");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.focusbox-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.article-title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.focusbox div.container")];
    }
}
