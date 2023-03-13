"use strict";

parserFactory.register("kemono.party", () => new KemonopartyParser());

class KemonopartyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    };

    getUrlsOfTocPages(dom) {
        let paginator = dom.querySelector("div.paginator menu");
        if (paginator === null) {
            return [];
        }
        return [...paginator.querySelectorAll("a:not(next)")]
            .map(link => link.href);
    }
    
    extractPartialChapterList(dom) {
        let links = [...dom.querySelectorAll(".card-list__items a")];
        return links.map(l => ({
            sourceUrl: l.href,
            title: l.querySelector("header").textContent.trim()
        }));
    }

    findContent(dom) {
        return dom.querySelector(".post__body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.post__title");
    }
}
