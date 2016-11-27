/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.register("sousetsuka.com", function() { return new BlogspotParser() });
parserFactory.registerRule(
    function(url, dom) { // eslint-disable-line no-unused-vars
        return util.extractHostName(url).indexOf(".blogspot.") != -1 }, 
    function() { return new BlogspotParser() }
);

class BlogspotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        let content = util.getElement(dom, "div", e => e.className.startsWith("post-body"));
        if (content == null) {
            content = util.getElement(dom, "div", e => e.className.startsWith("entry-content"));
        }
        return content;
    }

    customRawDomToContentStep(chapter, content) {
        this.replaceWeirdPElements(content);
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "h3", e => e.className.startsWith("post-title"));
        if (title == null) {
            title = util.getElement(dom, "h1", e => e.className.startsWith("entry-title"));
        }
        return title;
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        this.removeNextAndPreviousChapterHyperlinks(element);
    }

    /**
    *  http://skythewood.blogspot.com/ has <o:p> nodes
    *  I think they're supposed to be <p> nodes, but there's
    *  no 'o' namespace
    */
    replaceWeirdPElements(content) {
        util.removeElements(util.getElements(content, "O:P"));
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = util.moveIfParent(link, "span");
        return util.moveIfParent(toRemove, "div");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
