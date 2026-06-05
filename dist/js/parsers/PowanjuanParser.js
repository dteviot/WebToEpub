"use strict";

parserFactory.register("powanjuan.cc", () => new PowanjuanParser());

class PowanjuanParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.catalog");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#mycontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("gb2312") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".descTip, .descInfo")];
    }
}
