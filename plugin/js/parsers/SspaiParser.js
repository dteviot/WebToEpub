/*
  Very basic parser for sspai.com
*/
"use strict";

parserFactory.register("sspai.com", function() { return new SspaiParser(); });

class SspaiParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("body");
        return Promise.resolve(util.hyperlinksToChapterList(menu));        
    }

    findContent(dom) {
        return dom.querySelector("div.wangEditor-txt");
    }
}
