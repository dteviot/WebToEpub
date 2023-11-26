"use strict";

parserFactory.register("freewebnovel.com", () => new FreeWebNovelParser());
parserFactory.register("bednovel.com", () => new FreeWebNovelParser());
parserFactory.register("innnovel.com", () => new FreeWebNovelParser());
parserFactory.register("libread.com", () => new FreeWebNovelParser());

class FreeWebNovelParser extends Parser {

    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#idData");
        return util.hyperlinksToChapterList(menu);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tit");
    }

    extractAuthor(dom) {
        return dom.querySelector("[title=Author]").parentNode.querySelector("a").textContent;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelector("[title=Genre]").parentNode.querySelectorAll("a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic");
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.chapter");
    }

    findContent(dom) {
        return dom.querySelector("div.txt");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.inner")];
    }
}
