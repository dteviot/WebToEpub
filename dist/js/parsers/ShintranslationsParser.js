"use strict";

parserFactory.register("shintranslations.com", () => new ShintranslationsParser());

class ShintranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.text-formatting a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.content-area");
    }
}
