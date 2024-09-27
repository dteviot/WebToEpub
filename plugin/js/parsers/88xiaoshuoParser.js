"use strict";

parserFactory.register("88xiaoshuo.net", () => new _88xiaoshuoParser());
parserFactory.register("m.88xiaoshuo.net", () => new _88xiaoshuoParser());

class _88xiaoshuoParser extends Parser{
    constructor() {
        super();
        this.infoPageDom = null;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
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
            if (node.innerText == "尾页") {
                lastPage = node;
            }
        }
        let urls = [];
        if (lastPage) {
            const lastPageNumber = parseInt(lastPage.href.split("/")[4].split("_")[1]);
            const baseUrl = lastPage.baseURI.replace(/\/$/, "");
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
        let element = dom.querySelector(".author > a");
        return (element === null) ? null : element.textContent;
    }

    findChapterTitle(dom) {
        let element = dom.querySelector(".headline");
        return (element === null) ? null : element.textContent;
    }
    
    findCoverImageUrl(dom) {
        return dom.querySelector(".detail > img")?.src ?? null;
    }
}