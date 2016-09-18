/*
  parses hellping.org
*/
"use strict";

parserFactory.register("hellping.org", function() { return new HellpingParser() });

// nanodesu URLs have hostnames like '*thetranslation.wordpress.com'
parserFactory.registerRule(
    function(url) { return util.extractHostName(url).endsWith("thetranslation.wordpress.com"); }, 
    function() { return new HellpingParser() }
);

class HellpingParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "ul", e => e.id === "nav");
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return util.getElement(dom, "div", e => e.className === "page-body");
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
        return util.getElement(dom, "h2", e => (e.className === "page-title"));
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);
        that.removeNextAndPreviousChapterHyperlinks(element);
        util.removeLeadingWhiteSpace(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
