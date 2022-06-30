"use strict";

parserFactory.register("novelonomicon.com", () => new NovelonomiconParser());

class NovelonomiconParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.walkTocPages(dom,
            this.getChapterUrlsFromTocPage,
            this.nextTocPageUrl,
            chapterUrlsUI
        ))
    }

    getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("h3.entry-title a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    nextTocPageUrl(dom) {
        let current = dom.querySelector("li.g1-pagination-item-current");
        let sibling = current?.previousElementSibling;
        return ((sibling === null) || sibling.classList.contains("g1-pagination-item-prev")) 
            ? null
            : sibling.querySelector("a").href;
    }

    findContent(dom) {
        return dom.querySelector("div.entry-inner");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".archive-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".entry-before-title, a.su-button");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("h2.page-subtitle p")];
    }
}
