"use strict";

parserFactory.register("zeonic-republic.net", () => new ZeonicrepublicParser());

class ZeonicrepublicParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.info a")];
        if (links.length === 0) {
            links = [...dom.querySelectorAll("div.entry a")];
        }
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.book-info .cover img");
        return (img === null)
            ? util.getFirstImgSrc(dom, "div.entry")
            : util.getFirstImgSrc(dom, "div.book-info .cover");
    }
}
