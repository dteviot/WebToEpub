"use strict";

parserFactory.register("lilyonthevalley.com", function() { return new LilyonthevalleyParser() });

class LilyonthevalleyParser extends Parser{
    constructor() {
        super();
        this.ChacheChapterTitle = new Map();
    }

    async getChapterUrls(dom) {
        let sections = [...dom.querySelectorAll("section.story__chapters")];
        let paid_chapters = sections[0];
        let free_chapters = sections[1];
        let chapters = [];
        [...free_chapters.querySelectorAll("li a")].map(a => chapters.push(({
            sourceUrl: a.href, 
            title: a.textContent,
            isIncludeable: true
        })));
        [...paid_chapters.querySelectorAll("li a")].map(a => chapters.push(({
            sourceUrl: a.href, 
            title: a.textContent,
            isIncludeable: false
        })));
        return chapters;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story__identity-title").textContent;
    }

    extractAuthor(dom) {
        return dom.querySelector("a.author").textContent;
    }

    extractDescription(dom) {
        return dom.querySelector("section.story__summary").textContent.trim();
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("figure.story__thumbnail img")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__header, .story__summary")];
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter__title");
    }
}