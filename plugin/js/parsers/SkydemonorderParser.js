"use strict";

parserFactory.register("skydemonorder.com", () => new SkydemonorderParser());

class SkydemonorderParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div[x-show='expanded'] a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.prose");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.font-medium.text-sm");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.prose")];
    }
}
