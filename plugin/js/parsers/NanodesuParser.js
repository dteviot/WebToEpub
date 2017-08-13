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
        let menu = dom.querySelector("ul#nav");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div.page-body");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.page-title");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
