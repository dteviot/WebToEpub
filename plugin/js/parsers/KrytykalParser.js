/*
  parses krytykal.org
*/
"use strict";

parserFactory.register("krytykal.org", function() { return new KrytykalParser() });

class KrytykalParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let menu = util.getElement(dom, "div", e => e.className === "nav-menu");
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        let div = util.getElement(dom, "div", e => e.id === "content");
        return (div === null) ? null : util.getElement(div, "article");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
