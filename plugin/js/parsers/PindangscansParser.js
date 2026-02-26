"use strict";

parserFactory.register("pindangscans.com", () => new PindangscansParser());

class PindangscansParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    getUrlsOfTocPages(dom) {
        let tocUrls = [];
        let pagination = dom.querySelector("ul.page-numbers");
        if (pagination != null ) {
            let tocUrl = [...pagination.querySelectorAll("a:not(.next)")].pop()?.href;
            if (tocUrl) {
                let splitUrl = tocUrl.split("/");
                if (splitUrl.length >= 6) {
                    let maxPage = parseInt(splitUrl[4]);
                    for (let i = 2; i <= maxPage; ++i) {
                        splitUrl[4] = i;
                        tocUrls.push(splitUrl.join("/"));
                    }
                }
            }
        }
        return tocUrls;
    }

    extractPartialChapterList(dom) {
        let menu = dom.querySelector("ul[data-layout='list']");
        return util.hyperlinksToChapterList(menu);        
    }

    findContent(dom) {
        return dom.querySelector(".brxe-post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".brxe-heading");
    }
    findChapterTitle(dom) {
        return dom.querySelector(".brxe-post-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("main .brxe-text-basic")];
    }
}
