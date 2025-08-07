/*
  parses japtem.com
*/
"use strict";

parserFactory.register("japtem.com", function() { return new JaptemParser(); });

class JaptemParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div.post-content");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "h2");
    }
}
