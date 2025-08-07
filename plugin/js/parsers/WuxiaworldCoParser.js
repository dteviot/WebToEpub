"use strict";

//dead url/ parser
parserFactory.register("wuxiaworld.co", function() { return new WuxiaworldCoParser(); });
//dead url
parserFactory.register("m.wuxiaworld.co", () => new WuxiaworldCoParser());
//dead url
parserFactory.register("novelupdates.cc", () => new WuxiaworldCoParser());

class WuxiaworldCoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let list = dom.querySelector("ul.chapter-list");
        return util.hyperlinksToChapterList(list);
    }

    findContent(dom) {
        return dom.querySelector("div.section-list");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-name");
    }

    extractAuthor(dom) {
        return dom.querySelector("div.author span.name").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsis")];
    }
}
