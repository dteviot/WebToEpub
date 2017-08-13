"use strict";

parserFactory.register("zenithnovels.com", function() { return new ZenithNovelsParser() });

class ZenithNovelsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        return dom.querySelector("article");
    }
}
