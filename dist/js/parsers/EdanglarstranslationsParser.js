"use strict";

parserFactory.register("edanglarstranslations.com", () => new EdanglarstranslationsParser());

class EdanglarstranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("article a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("article div[property='schema:text']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p")];
    }
}
