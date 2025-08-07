"use strict";

parserFactory.register("nineheavens.org", () => new NineHeavensParser());

class NineHeavensParser extends Parser { 
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ol.chapter-group__list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("article.chapter__article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story__identity-title");
    }


    extractDescription(dom) {
        return dom.querySelector("section.story__summary").textContent.trim();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.chapter__actions, a.chapter__story-link, em.chapter__author, footer.chapter__footer");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure.story__thumbnail");
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section.story__summary")];
    }
}
