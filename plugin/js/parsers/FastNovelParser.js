"use strict";

//dead url/ parser
parserFactory.register("fastnovel.net", () => new FastNovelParser());
//dead url
parserFactory.register("novelgate.net", () => new FastNovelParser());

class FastNovelParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div#list-chapters li a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.film-info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.film-info ul.meta-data a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.episode-name");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.book-cover");
        return img === null ? null : img.getAttribute("data-original");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.film-content")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "div.tags");
    }    
}
