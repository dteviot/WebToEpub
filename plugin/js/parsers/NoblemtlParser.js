"use strict";

parserFactory.register("noblemtl.com", () => new NoblemtlParser());
parserFactory.register("tamagotl.com", () => new NoblemtlParser());

class NoblemtlParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(this.linkToChapter)
            .reverse()
    }

    linkToChapter(link) {
        let title = link.querySelector(".epl-num").textContent + " "
            + link.querySelector(".epl-title").textContent;
        return ({
            sourceUrl:  link.href,
            title: title
        });
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".thumbook");
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingCss(webPageDom, "div.saboxplugin-wrap");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content")];
    }
}
