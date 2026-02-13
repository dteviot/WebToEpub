"use strict";

//dead url/ parser
parserFactory.register("zenithnovels.com", () => new ZenithNovelsParser());

class ZenithNovelsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let urls = await this.getChapterUrlsFromMultipleTocPages(dom,
            ZenithNovelsParser.extractPartialChapterList,
            ZenithNovelsParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
        return urls.reverse();
    }

    static getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll("ul.lcp_paginator a:not(.lcp_nextlink)")]
            .map(link => link.href);
    }
    
    static extractPartialChapterList(dom) {
        let list = dom.querySelector("ul.lcp_catlist");
        return util.hyperlinksToChapterList(list);
    }
    
    findContent(dom) {
        return dom.querySelector("article");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry p")];
    }
}
