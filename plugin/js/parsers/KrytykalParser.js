/*
  parses krytykal.org
*/
"use strict";

parserFactory.register("krytykal.org", function() { return new KrytykalParser(); });

class KrytykalParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.nav-menu");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div#content article");
    }
}
