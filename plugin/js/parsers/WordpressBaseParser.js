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
        let content = util.getElement(dom, "div", e => e.className.includes("entry-content"));
        if (content === null) {
            content = util.getElement(dom, "div", e => e.className.startsWith("post-content"));
        }
        return  content;
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
        let elements = dom.getElementsByClassName("entry-title");
        if (elements.length === 0) {
            elements = dom.getElementsByClassName("page-title");
        }
        let title = (elements.length === 0) ? null : elements[0];
        if (title === null) {
            title = util.getElement(dom, "header", e => e.className === "post-title");
            if (title !== null) {
                title = util.getElement(title, "h1");
            }
        }
        return title;
    }

    findChapterTitle(dom) {
        let title = WordpressBaseParser.findChapterTitleElement(dom);
        if (title === null) {
            title = BlogspotParser.findChapterTitleElement(dom);
        }
        return title;
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
