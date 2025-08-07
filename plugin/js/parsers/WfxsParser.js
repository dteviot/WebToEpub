"use strict";

parserFactory.register("wfxs.tw", () => new WfxsParser());

class WfxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = this.makeTocUrl(dom.baseURI);
        let tocHtml = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let menu = [...tocHtml.querySelectorAll("#readerlists")].pop();
        return util.hyperlinksToChapterList(menu);
    }

    makeTocUrl(url) {
        return url.substring(0, url.length - 1)
            .replace("xiaoshuo", "booklist") + ".html";
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);        
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".booktitle h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#bookimg");
    }

    async fetchChapter(url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        newDoc.content.appendChild(this.findRawContent(dom));
        let nextPageUrl = this.findNextPageUrl(dom);
        while (nextPageUrl != null) {
            dom = (await HttpClient.wrapFetch(nextPageUrl)).responseXML;
            newDoc.content.appendChild(this.findRawContent(dom));
            nextPageUrl = this.findNextPageUrl(dom);
        }
        return newDoc.dom;
    }

    findRawContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    findNextPageUrl(dom) {
        let link = [...dom.querySelectorAll(".foot-nav a")]
            .map(l => l.href)[2];
        return ((link != null)  && link.endsWith(".html"))
            ? link
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#intro_win p")];
    }
}
