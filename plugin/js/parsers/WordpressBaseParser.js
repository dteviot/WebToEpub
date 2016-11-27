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

    // find the node(s) holding the story content
    findContent(dom) {
        let div = util.getElement(dom, "div", e => e.className === "entry-content");
        return div;
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);

        that.removeNextAndPreviousChapterHyperlinks(element);
        util.removeLeadingWhiteSpace(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "next" and "previous" chapter links may be inside <strong> then <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h1", e => (e.className === "entry-title"));
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
