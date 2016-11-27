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
        return (WordpressBaseParser.FindContentElement(dom) != null) &&
            (WordpressBaseParser.findChapterTitleElement(dom) != null); 
    }, 
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
        let chapters = util.hyperlinksToChapterList(content);
        return Promise.resolve(chapters);
    }

    static FindContentElement(dom) {
        return util.getElement(dom, "div", e => e.className.startsWith("entry-content"));
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return WordpressBaseParser.FindContentElement(dom);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "next" and "previous" chapter links may be inside <strong> then <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    static findChapterTitleElement(dom) {
        let elements = dom.getElementsByClassName("entry-title");
        if (elements.length === 0) {
            elements = dom.getElementsByClassName("page-title");
        }
        return (elements.length === 0) ? null : elements[0];
    }

    findChapterTitle(dom) {
        return WordpressBaseParser.findChapterTitleElement(dom);
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
