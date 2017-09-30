/*
  Basic functionality for parsing wordpress (I hope)
*/
"use strict";

parserFactory.register("shalvationtranslations.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("frostfire10.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("isekaicyborg.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("moonbunnycafe.com", function() { return new WordpressBaseParser() });
parserFactory.register("raisingthedead.ninja", function() { return new WordpressBaseParser() });
parserFactory.register("yoraikun.wordpress.com", function() { return new WordpressBaseParser() });

parserFactory.registerRule(
    function(url, dom) {
        return (WordpressBaseParser.findContentElement(dom) != null) &&
            (WordpressBaseParser.findChapterTitleElement(dom) != null); 
    }, 
    function() { return new WordpressBaseParser() }
);

parserFactory.registerManualSelect(
    "Wordpress", 
    function() { return new WordpressBaseParser() }
);

class WordpressBaseParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let content = that.findContent(dom).cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        return Promise.resolve(util.hyperlinksToChapterList(content));
    }

    static findContentElement(dom) {
        return dom.querySelector("div.entry-content") ||
            dom.querySelector("div.post-content");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let content = WordpressBaseParser.findContentElement(dom);
        if (content === null) {
            content = BlogspotParser.findContentElement(dom);
        }
        return content;
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "next" and "previous" chapter links may be inside <strong> then <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    static findChapterTitleElement(dom) {
        return dom.querySelector(".entry-title") ||
            dom.querySelector(".page-title") ||
            dom.querySelector("header.post-title h1");
    }

    findChapterTitle(dom) {
        let title = WordpressBaseParser.findChapterTitleElement(dom);
        if (title === null) {
            title = BlogspotParser.findChapterTitleElement(dom);
        }
        return title;
    }
}
