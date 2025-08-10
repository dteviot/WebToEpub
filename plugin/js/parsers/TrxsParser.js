"use strict";

parserFactory.register("trxs.me", () => new TrxsParser());

class TrxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".book_list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".read_chapterDetail");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".read_chapterName.tc h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".pic");
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("gb2312") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".infos p")];
    }
}
