/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.registerRule(
    function(url) { return util.extractHostName(url).indexOf(".blogspot.") != -1 }, 
    function() { return new BlogspotParser() }
);

class BlogspotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let menu = that.findContent(dom);
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
        let title = util.getElement(dom, "h3", e => e.className.startsWith("post-title"));
        if (title == null) {
            title = util.getElement(dom, "h1", e => e.className.startsWith("entry-title"));
        }
        return title;
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);
        that.removeNextAndPreviousChapterHyperlinks(element);
        util.removeUnwantedWordpressElements(element);
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
