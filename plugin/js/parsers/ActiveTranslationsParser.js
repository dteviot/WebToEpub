"use strict";

parserFactory.register("activetranslations.xyz", () => new ActiveTranslationsParser());

class ActiveTranslationsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("a.panel-title")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        let content = dom.querySelector("div.entry-content");
        util.removeChildElementsMatchingCss(content, ".code-block, #comments");
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.nv-page-title h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.nv-page-title h1");
    }
}
