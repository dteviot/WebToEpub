/*
  parses hellping.org
*/
"use strict";

parserFactory.register("hellping.org", function() { return new HellpingParser() });

class HellpingParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("nav[id='main-navigation']");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }
}
