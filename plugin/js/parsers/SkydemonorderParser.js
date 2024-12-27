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
        return dom.querySelector("[wire\\:ignore]");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1").nextElementSibling;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.w-full");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".lg\\:col-span-2 .text-primary-500")];
    }
}
