"use strict";

parserFactory.register("230book.net", () => new _230BookParser() );

class _230BookParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1").textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector(".bookname h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg");
    }

    async fetchChapter(url) {
        // site does not tell us gbk is used to encode text
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#intro")];
    }
}
