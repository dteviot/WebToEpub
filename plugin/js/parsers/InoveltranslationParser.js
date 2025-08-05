"use strict";

parserFactory.register("inoveltranslation.com", () => new InoveltranslationParser());

class InoveltranslationParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("section[class^='styles_chapter_list'] div:has(>a):not(:has(> div))")]
            .map(link => this.linkToChapter(link)).reverse();
    }

    linkToChapter(link) {
        let a = link.querySelector("a");

        return ({
            sourceUrl: a.href,
            title: a.textContent,
        });
    }

    findContent(dom) {
        return dom.querySelector("section[data-sentry-component='RichText']");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section[class^='styles_details_container'] dl:last-child")];
    }
}
