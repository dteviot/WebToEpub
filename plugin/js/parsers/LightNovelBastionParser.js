/*
  parses lightnovelbastion.com
*/
"use strict";

parserFactory.register("lightnovelbastion.com", function() { return new LightNovelBastionParser() });

class LightNovelBastionParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters.reverse());
    }

    findContent(dom) {
        return util.getElement(dom, "section");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
