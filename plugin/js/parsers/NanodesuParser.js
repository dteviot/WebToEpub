/*
  parses nanodesu
*/
"use strict";

// nanodesu URLs have hostnames like '*thetranslation.wordpress.com'
parserFactory.registerRule(
    function(url, dom) { // eslint-disable-line no-unused-vars 
        return util.extractHostName(url).endsWith("thetranslation.wordpress.com"); }, 
    function() { return new NanodesuParser() }
);

class NanodesuParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "ul", e => e.id === "nav");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return util.getElement(dom, "div", e => e.className === "page-body");
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h2", e => (e.className === "page-title"));
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
