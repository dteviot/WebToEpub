"use strict";

//dead url/ parser
parserFactory.register("novelplex.org", () => new NovelplexParser());

class NovelplexParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".nAP__TOCArea a")]
            .map(a => this.hyperLinkToChapter(a));
    }

    hyperLinkToChapter(link) {
        return ({
            sourceUrl: link.href,
            title: link.querySelector("p").textContent
        });
    }

    findContent(dom) {
        return dom.querySelector(".halChap--kontenInner");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".headerNovel__wrap h2");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".pt_aBody, .pt_aButton");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".halChap h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".headerNovel");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".summary_mobile")];
    }
}
