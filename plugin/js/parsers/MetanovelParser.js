"use strict";

//dead url/ parser
parserFactory.register("m.metanovel.org", () => new MetanovelParser());

class MetanovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocUrl = dom.baseURI + "/chapters/1";
        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        return (await this.walkTocPages(tocPage, 
            this.chaptersFromDom, 
            this.nextTocPageUrl, 
            chapterUrlsUI
        ));
    }

    chaptersFromDom(dom) {
        let menu = dom.querySelector(".section-list");
        return util.hyperlinksToChapterList(menu);
    }

    nextTocPageUrl(dom) {
        let nextUrl = dom.querySelector(".listpage span.right a")?.href;
        return util.isNullOrEmpty(nextUrl) ? null : nextUrl;
    }
    
    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detail-box h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".imgbox");
    }

    async fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    moreChapterTextUrl(dom) {
        let nextUrl = [...dom.querySelectorAll(".section-opt a")].pop()?.href;
        return (nextUrl != null && nextUrl.includes("?page"))
            ? nextUrl
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".desc")];
    }
}
