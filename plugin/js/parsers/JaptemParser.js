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
        let that = this;
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

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);
        that.removeNextAndPreviousChapterHyperlinks(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = link;
        if (toRemove.parentNode.tagName.toLowerCase() === "h2") {
            toRemove = toRemove.parentNode;
        };
        return toRemove;
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
