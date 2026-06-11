"use strict";

parserFactory.register("nyantl.wordpress.com", () => new NyantlParser());

class NyantlParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.wp-block-post-title");
    }
}
