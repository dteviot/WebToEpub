"use strict";

parserFactory.register("skydemonorder.com", () => new SkydemonorderParser());

class SkydemonorderParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // eslint-disable-next-line
        return [...dom.querySelectorAll("a.block.py-2\\\.5.border-b.border-border.group")]
            .map(a => this.hyperLinkToChapter(a))
            .reverse();
    }

    hyperLinkToChapter(link) {
        let titleText = link.querySelector("span").textContent.trim();

        return {
            sourceUrl: link.href,
            title: `${titleText}`,
        };
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        let h1 = dom.querySelector("h1");
        return h1 ? h1.textContent.trim() : "";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.w-full");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[x-ref='desc'] p")];
    }
}
