"use strict";

parserFactory.register("lightnovelstranslations.com", function() { return new LightNovelsTranslationsParser(); });

class LightNovelsTranslationsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.chapter-item a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.text_story");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel_title h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel_info");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel_text")];
    }
}
