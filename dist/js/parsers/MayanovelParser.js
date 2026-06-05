"use strict";

//dead url/ parser
parserFactory.register("mayanovel.com", () => new MayanovelParser());

class MayanovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".m-book-list li a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        return dom.querySelector(".m-infos a")?.textContent ?? null;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let nextUrl = this.nextPageOfChapterUrl(dom);
        let oldContent = this.findContent(dom);
        while (nextUrl != null) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let newContent = this.findContent(nextDom);
            util.moveChildElements(newContent, oldContent);
            nextUrl = this.nextPageOfChapterUrl(nextDom);
        }
        return dom;
    }

    nextPageOfChapterUrl(dom) {
        let nextUrl = dom.querySelector("a[rel='next']")?.href;
        return (nextUrl != null) && nextUrl.includes("_")
            ? nextUrl
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".m-book_info p")];
    }
}
