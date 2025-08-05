"use strict";

parserFactory.register("sjks88.com", () => new Sjks88Parser());
parserFactory.register("m.sjks88.com", () => new Sjks88Parser());

class Sjks88Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("GB2312") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc")];
    }
}
