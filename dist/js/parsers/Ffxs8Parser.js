"use strict";

parserFactory.register("ffxs8.com", () => new Ffxs8Parser());

class Ffxs8Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.catalog");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.article h1");
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb2312")
        });
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.descInfo")];
    }
}
