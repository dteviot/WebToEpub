/*
  parses hellping.org
*/
"use strict";

parserFactory.register("hellping.org", function() { return new HellpingParser() });
parserFactory.registerRule(
    function(url) { return HellpingParser.isParsable(url) }, 
    function() { return new HellpingParser() }
);

class HellpingParser extends Parser {
    constructor() {
        super();
    }

    static isParsable(url) {
        // nanodesu URLs have hostnames like '*thetranslation.wordpress.com'
        return util.extractHostName(url).indexOf("thetranslation.wordpress.com") != -1;
    }

    getChapterUrls(dom) {
        let that = this;
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
        util.removeUnwantedWordpressElements(element);
        util.removeLeadingWhiteSpace(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = link;
        if (toRemove.parentNode.tagName.toLowerCase() === "p") {
            toRemove = toRemove.parentNode;
        };
        return toRemove;
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
