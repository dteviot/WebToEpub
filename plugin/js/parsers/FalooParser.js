"use strict";

parserFactory.register("faloo.com", () => new FalooParser());

class FalooParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.DivTable div div a")]
            .map(a => util.hyperLinkToChapter(a));
    }
}