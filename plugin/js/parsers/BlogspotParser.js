/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.register("sousetsuka.com", function() { return new BlogspotParser() });
parserFactory.registerRule(
    function(url, dom) {
        return (util.extractHostName(url).indexOf(".blogspot.") != -1) ||
            (BlogspotParser.findContentElement(dom) != null); 
    }, 
    function() { return new BlogspotParser() }
);

parserFactory.registerManualSelect(
    "Blogspot", 
    function() { return new BlogspotParser() }
);

class BlogspotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    static findContentElement(dom) {
        return dom.querySelector("div.post-body") ||
            dom.querySelector("div.pagepost div.cover");
    }

    findContent(dom) {
        return BlogspotParser.findContentElement(dom) ||
            dom.querySelector("div.entry-content");
    }

    static findChapterTitleElement(dom) {
        return dom.querySelector("h3.post-title, h1.entry-title");
    }

    findChapterTitle(dom) {
        return BlogspotParser.findChapterTitleElement(dom);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = util.moveIfParent(link, "span");
        return util.moveIfParent(toRemove, "div");
    }
}
