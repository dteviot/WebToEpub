"use strict";

parserFactory.register("4ksw.com", () => new _4kswParser());

class _4kswParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.list-charts");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content-body");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".panel-heading");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".info1");
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("gbk") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".info2 div")];
    }
}
