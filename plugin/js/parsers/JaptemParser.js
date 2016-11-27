/*
  parses japtem.com
*/
"use strict";

parserFactory.register("japtem.com", function() { return new JaptemParser() });

class JaptemParser extends Parser {
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
        return util.getElement(dom, "div", e => e.className === "post-content");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "h2");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
