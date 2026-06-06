"use strict";

//dead url/ parser
parserFactory.register("m.bqg225.com", () => new Bqg225Parser());

class Bqg225Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("div.book_more a").href;
        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let menu = tocPage.querySelector("div.book_last");
        this.removeToToBottomOfPageLink(menu);
        return util.hyperlinksToChapterList(menu);
    }
    
    removeToToBottomOfPageLink(menu) {
        menu.querySelector("a[style]")?.remove();
    }

    findContent(dom) {
        return dom.querySelector("div#chaptercontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book_box dt.name")?.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.title")?.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book_about")];
    }
}
