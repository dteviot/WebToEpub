/*
  Basic functionality for parsing wordpress (I hope)
*/
"use strict";

parserFactory.register("shalvationtranslations.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("frostfire10.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("isekaicyborg.wordpress.com", function() { return new WordpressBaseParser() });
parserFactory.register("moonbunnycafe.com", function() { return new WordpressBaseParser() });

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
        let that = this;
        let div = util.getElement(dom, "div", e => e.className === "entry-content");
        return div;
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);

        that.removeNextAndPreviousChapterHyperlinks(element);
        util.removeUnwantedWordpressElements(element);
        util.removeLeadingWhiteSpace(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "next" and "previous" chapter links may be inside <strong> then <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    customRawDomToContentStep(chapter, content) {
        this.addTitleToContent(chapter.rawDom, content);
    }

    addTitleToContent(dom, content) {
        let that = this;
        let title = that.findChapterTitle(dom);
        if (title !== null) {
            content.insertBefore(title, content.firstChild);
        };
    }

    findChapterTitle(dom) {
        let header = util.getElement(dom, "header", e => (e.className === "entry-header"));
        return (header === null) ? null : util.getElement(header, "h1");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
