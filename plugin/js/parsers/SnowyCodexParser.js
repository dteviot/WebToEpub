"use strict";

parserFactory.register("snowycodex.com", () => new SnowyCodexParser());

class SnowyCodexParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.entry-content h2");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content p")];
    }
}
