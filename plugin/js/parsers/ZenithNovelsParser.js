"use strict";

parserFactory.register("zenithnovels.com", function() { return new ZenithNovelsParser() });

class ZenithNovelsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        return util.getElement(dom, "article");
    }
}
