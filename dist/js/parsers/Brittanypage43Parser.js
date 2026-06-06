"use strict";

parserFactory.register("brittanypage43.com", () => new Brittanypage43Parser());

class Brittanypage43Parser extends Parser {
    constructor() {
        super();
    }

    disabled() {
        return UIText.Warning.parserDisabledNotification;
    }
    
    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("a.post-card-content-link")]
            .map(this.linkToChapter).reverse();
    }

    linkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link.querySelector(".post-card-title").textContent.trim()
        };
    }

    findContent(dom) {
        return dom.querySelector(".gh-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".post-card-large header h2");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".article-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".post-card-image-link");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".post-card-excerpt")];
    }
}
