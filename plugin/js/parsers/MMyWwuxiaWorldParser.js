"use strict";

//dead url/ parser
parserFactory.register("m.mywuxiaworld.com", () => new MMyWwuxiaWorldParser());

class MMyWwuxiaWorldParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let newDom = (await HttpClient.wrapFetch(dom.baseURI + "dir.html")).responseXML;
        return [...newDom.querySelectorAll("div.chapter-list a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.pt-read-cont");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.pt-bookdetail a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.pt-read div").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pt-bookdetail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.pt-bookdetail > div.flex-item, span.pt-book-intro")];
    }
}
