/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.register("sousetsuka.com", function() { return new BlogspotParser() });

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).indexOf(".blogspot.") != -1),
    () => new BlogspotParser()
);

parserFactory.registerRule(
    // return probability (0.0 to 1.0) web page is a Blogspot page
    function(url, dom) {
        return (util.extractHostName(url).indexOf(".blogspot.") != -1) ||
            ((BlogspotParser.findContentElement(dom) != null) * 0.5);
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
        let chapters = util.hyperlinksToChapterList(menu);
        if (0 < chapters.length) {
            return Promise.resolve(chapters);
        }
        // try "Blog Archive" links
        chapters = [...dom.querySelectorAll("ul.posts a")]
            .map(link => util.hyperLinkToChapter(link));
        return Promise.resolve(chapters.reverse());
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
