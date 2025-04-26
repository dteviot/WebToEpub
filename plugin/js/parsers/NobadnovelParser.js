/*
  Parses files on www.nobadnovel.com
*/
"use strict";

parserFactory.register("nobadnovel.com", function() { return new NobadnovelParser() });

class NobadnovelParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 500;
    }
    //it feels like one user with simutanfetch set to 8 can overhelm the server
    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        let tocHtml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        let table = tocHtml.querySelector("#table");
        return util.hyperlinksToChapterList(table);
    }

    findContent(dom) {
        return dom.querySelector("div.text-base");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("title");
    }

    extractDescription(dom) {
        return dom.querySelector("div.content").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img.object-cover")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.content")];
    }
}
