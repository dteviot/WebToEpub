"use strict";

//dead url/ parser
parserFactory.register("mandarinducktales.com", () => new MandarinducktalesParser());

class MandarinducktalesParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".wp-container-10 p a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector(".wp-container-10");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".wp-container-10")];
    }
}
