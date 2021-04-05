"use strict";

parserFactory.register("fimfiction.net", () => new FimfictionParser());

class FimfictionParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("h1.chapter-title div[style='float:right'] ul.scrollable a")];
        if (links.length === 0) {
            return [{
                sourceUrl:  dom.baseURI,
                title: this.extractTitleImpl(dom).textContent
            }]
        }
        return links.map(this.linkToChapter)
    }

    linkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link.querySelector("span.chapter-selector__title").textContent
        };
    }

    findContent(dom) {
        return dom.querySelector("div#chapter");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1 a");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.author");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "h1.chapter-title div[style='float:right']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.story-page-header");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.story-page-header div.info-container div.desktop p")];
    }
}
