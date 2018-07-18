"use strict";

parserFactory.register("zenithnovels.com", function() { return new ZenithNovelsParser() });

class ZenithNovelsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = ZenithNovelsParser.extractPartialChapterList(dom);
        let tocPages = ZenithNovelsParser.getUrlsOfTocPages(dom);
        return Promise.all(
            tocPages.map(url => ZenithNovelsParser.fetchPartialChapterList(url))
        ).then(function (tocFragments) {
            return tocFragments.reduce((a, c) => a.concat(c), chapters).reverse();
        });
    }

    static getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll("ul.lcp_paginator a:not(.lcp_nextlink)")]
            .map(link => link.href);
    }
    
    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return ZenithNovelsParser.extractPartialChapterList(xhr.responseXML);
        });
    }
    
    static extractPartialChapterList(dom) {
        let list = dom.querySelector("ul.lcp_catlist");
        return util.hyperlinksToChapterList(list);
    }
    
    findContent(dom) {
        return dom.querySelector("article");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [];
        let summary = [...dom.querySelectorAll("div.entry p")];
        for(let node of summary) {
            let clone = node.cloneNode(true);
            this.cleanInformationNode(clone);
            nodes.push(clone);
        }
        return nodes;
    }

    cleanInformationNode(node) {
        let toRemove = [...node.querySelectorAll("img")];
        util.removeElements(toRemove);
    }
}
