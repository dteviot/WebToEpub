"use strict";

parserFactory.register("novelversetranslations.com", () => new NovelversetranslationsParser());

class NovelversetranslationsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            this.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    extractPartialChapterList(dom) {
        let menu = dom.querySelector(".lcp_catlist");
        return util.hyperlinksToChapterList(menu);
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let paginateUrls = [...dom.querySelectorAll("ul.lcp_paginator a:not(.lcp_nextlink)")]
            .map(a => a.href);
        if (0 < paginateUrls.length) {
            let url = new URL(paginateUrls.pop());
            let maxPage = this.maxPageId(url);
            for (let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("lcp_page0", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    maxPageId(url) {
        let pageNum = new URL(url).searchParams.get("lcp_page0");
        return parseInt(pageNum);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.page-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".nnl_container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".post-media");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".post-content p")];
    }
}
