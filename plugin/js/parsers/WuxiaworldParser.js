/*
  Parses www.wuxiaworld.com
*/
"use strict";

parserFactory.register("wuxiaworld.com", function() { return new WuxiaworldParser() });

class WuxiaworldParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("li.chapter-item a")]
            .map(link => util.hyperLinkToChapter(link));
        return Promise.resolve(chapters);  
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let candidates = [...dom.querySelectorAll("div.fr-view")];
        return WuxiaworldParser.elementWithMostParagraphs(candidates);
    }

    static elementWithMostParagraphs(elements) {
        if (elements.length === 0) {
            return null;
        }
        return elements.map(
            e => ({e: e, numParagraphs: [...e.querySelectorAll("p")].length})
        ).reduce(
            (a, c) => a.numParagraphs < c.numParagraphs ? c : a
        ).e;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.caption h4");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.media-left");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.media-novel-index div.media-body")];
        let summary = [...dom.querySelectorAll("div.fr-view")];
        nodes.push(summary[1]);
        return nodes;
    }
}
