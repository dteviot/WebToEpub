"use strict";

parserFactory.register("fictionhunt.com", () => new FictionhuntParser());

class FictionhuntParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.Story__contents-list a")]
            .map(this.linkToChapter);
    }

    linkToChapter(link) {
        let label = link.querySelector("label").textContent;
        let title = link.querySelector("div.Story__contents-chapter-title span").textContent;
        return ({
            sourceUrl:  link.href,
            title: label + ": " + title
        });
    }

    findContent(dom) {
        return dom.querySelector("div.StoryChapter__text");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        return dom.querySelector(".Story__meta a")?.textContent ?? null;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.js-chapter-title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.text-justify")];
    }
}
