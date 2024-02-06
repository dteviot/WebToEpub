"use strict";

parserFactory.register("shirokuns.com", () => new ShirokunsParser());

class ShirokunsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.blog-post li a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.main h1");
    }

    preprocessRawDom(chapterDom) {
        util.removeChildElementsMatchingCss(chapterDom, "p.author, div.col-md-12 img")
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("article p img")
        return img === null ? null : img.src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#editdescription")];
    }
}
