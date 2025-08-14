"use strict";

//dead url/ parser
parserFactory.register("mangallama.com", () => new MangalamaParser());

class MangalamaParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chaptersElement = dom.querySelector("table.table-striped");
        return Promise.resolve(util.hyperlinksToChapterList(chaptersElement).reverse());
    }

    findContent(dom) {
        return dom.querySelector("div#chapcontainer");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div#titlecontainer").textContent;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img.img-thumbnail").src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#description")];
    }
}
