/*
  parser for http://www.wuxiaworld.co
*/
"use strict";

parserFactory.register("wuxiaworld.co", function() { return new WuxiaworldCoParser() });
parserFactory.register("m.wuxiaworld.co", () => new WuxiaworldCoParser());

class WuxiaworldCoParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let list = dom.querySelector("ul.chapter-list");
        return util.hyperlinksToChapterList(list);
    };

    findContent(dom) {
        return dom.querySelector("div.section-list");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-name");
    };

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
