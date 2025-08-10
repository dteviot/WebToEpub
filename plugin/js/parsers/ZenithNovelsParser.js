"use strict";

//dead url/ parser
parserFactory.register("zenithnovels.com", function() { return new ZenithNovelsParser(); });

class ZenithNovelsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            ZenithNovelsParser.extractPartialChapterList,
            ZenithNovelsParser.getUrlsOfTocPages,
            chapterUrlsUI
        ).then(l => l.reverse());
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
