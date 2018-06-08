/*
  parser for http://www.wuxiaworld.co
*/
"use strict";

parserFactory.register("www.wuxiaworld.co", function() { return new WuxiaworldCoParser() });

class WuxiaworldCoParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let list = dom.querySelector("div#list");
        return Promise.resolve(util.hyperlinksToChapterList(list));        
    };

    findContent(dom) {
        return dom.querySelector("div#content");
    };

    extractTitle(dom) {
        return dom.querySelector("div#info h1").textContent.trim();
    };

    findChapterTitle(dom) {
        return dom.querySelector("div.bookname h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#sidebar");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#maininfo")];
    }
}
