"use strict";

parserFactory.registerDeadSite("trxs.me", () => new TrxsParser());
parserFactory.register("trxs.cc", () => new TrxsParser());
parserFactory.register("tongrenshe.cc", () => new TrxsParser());

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

    extractLanguage() {
        return "zh-CN";
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".infos > h1:nth-child(1)");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".date > span:nth-child(1) > a:nth-child(1)");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("gbk") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    extractDescription(dom) {
        return dom.querySelector(".infos > p:nth-child(4)").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".infos p")];
    }
}
