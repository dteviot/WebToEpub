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
        return Promise.resolve(util.hyperlinksToChapterList(menu));
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
