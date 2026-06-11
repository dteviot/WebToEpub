"use strict";

parserFactory.register("novelmania.com.br", () => new NovelmaniaParser());

class NovelmaniaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("ol.list-inline a")];
        for (let link of links) {
            link.querySelector("small")?.remove();
        }
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("span.authors");
        author?.querySelector("b")?.remove();
        return author?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "pt";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.text")];
    }
}
