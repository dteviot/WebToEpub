"use strict";

parserFactory.register("tongrenquan.org", () => new TongrenquanParser());

class TongrenquanParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.book_list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".read_chapterDetail");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".infos h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".date span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom) {
        return dom.querySelector(".read_chapterName h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book_info");
    }

    async fetchChapter(url) {
        let options = ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".infos > p")];
    }
}
