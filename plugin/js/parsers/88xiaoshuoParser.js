"use strict";

parserFactory.register("m.88xiaoshuo.net", () => new _88xiaoshuoParser());
parserFactory.register("88xiaoshuo.net", () => new _88xiaoshuoParser());
parserFactory.register("m.ilwxs.com", () => new _88xiaoshuoParser());
parserFactory.register("ilwxs.com", () => new _88xiaoshuoParser());
parserFactory.register("m.ttshu8.com", () => new _88xiaoshuoParser());
parserFactory.register("ttshu8.com", () => new _88xiaoshuoParser());
parserFactory.register("m.xpaoshuba.com", () => new _88xiaoshuoParser());
parserFactory.register("xpaoshuba.com", () => new _88xiaoshuoParser());
parserFactory.register("m.shuhaige.net", () => new _88xiaoshuoParser());
parserFactory.register("shuhaige.net", () => new _88xiaoshuoParser());
parserFactory.register("m.qbxsw.com", () => new _88xiaoshuoParser());
parserFactory.register("qbxsw.com", () => new _88xiaoshuoParser());
parserFactory.register("m.38xs.com", () => new _88xiaoshuoParser());

class _88xiaoshuoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let changedomurl = dom.baseURI;
        if (changedomurl.includes("https://www.")) {
            changedomurl = changedomurl.replace("https://www.","https://m.");
        }
        if (changedomurl != dom.baseURI) {
            dom = (await HttpClient.fetchHtml(changedomurl)).responseXML;
        }
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    getUrlsOfTocPages(dom) {
        let lastPagespan = [...dom.querySelectorAll(".caption > span > a")];
        let lastPage = null;
        for (let node of lastPagespan) {
            if (node.innerText == "尾页" || node.innerText == "Last page") {
                lastPage = node;
            }
        }
        let urls = [];
        if (lastPage) {
            const lastPageNumber = parseInt(lastPage.href.substring(lastPage.href.search(/_[0-9]+\/?$/)).replace("_", "").replace("/", ""));
            const baseUrl = lastPage.baseURI.replace(/_[0-9]+\/$/, "").replace(/\/$/, "");
            for (let i = 2; i <= lastPageNumber; i++) {
                urls.push(`${baseUrl}_${i}`);
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        let chapterList = dom.querySelector(".read");
        return [...chapterList.querySelectorAll("a")].map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".name");
    }

    extractAuthor(dom) {
        let element = dom.querySelector("#maininfo a[href*=\"author\"], .author a");
        return (element === null) ? "" : element.textContent;
    }

    findChapterTitle(dom) {
        let element = dom.querySelector(".headline");
        return (element === null) ? null : element.textContent;
    }
    
    findCoverImageUrl(dom) {
        return dom.querySelector(".box_con img, .detail > img")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#maininfo, .detail")];
    }

    extractDescription(dom) {
        let element = dom.querySelector("#intro");
        return (element === null) ? null : element.textContent;
    }
}