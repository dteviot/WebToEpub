"use strict";

parserFactory.register("dragonholictranslations.com", () => new DragonholictranslationsParser());

class DragonholictranslationsParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div#chapter-list-container a")];
        return links.reverse().map(l => this.linkToChapter(l));
    }

    linkToChapter(link) {
        let extract = (css) => link.querySelector(css).textContent.trim();
        let num = extract("span.text-foreground");
        let title = extract("span.text-muted-foreground");
        return {
            sourceUrl: link.href,
            title: num + ": " + title,
        };
    }

    findContent(dom) {
        return dom.querySelector("div.prose");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("[x-ref='synopsis']")];
    }
}
