"use strict";

parserFactory.register("volarenovels.com", () => new VolarenovelsParser());

class VolarenovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.list-chapters a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.panel-body div.fr-view");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    extractDescription(dom) {
        return dom.querySelector("div#Details").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.panel-body h4");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#content-container");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#Details")];
    }
}
