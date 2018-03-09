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
            .map(link => util.hyperLinkToChapter(link, null));
        return Promise.resolve(chapters);  
    }

    extractTitle(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        return title === null ? super.extractTitle(dom) : title.getAttribute("content");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div.fr-view");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.media-left");
    }
}
