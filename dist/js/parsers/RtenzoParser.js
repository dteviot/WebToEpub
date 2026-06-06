"use strict";

parserFactory.register("rtenzo.net", () => new RtenzoParser());

class RtenzoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".entry-content a")]
            .filter(a => a.querySelector("img") != null);
        return links.map(this.linkToChapter);
    }
    
    linkToChapter(link) {
        let path = new URL(link.href).pathname.split("/");
        let title = path[path.length - 2].replace(/-/g, " ");
        return {
            sourceUrl:  link.href,
            title: title
        };
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }
}
