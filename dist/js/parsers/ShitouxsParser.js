"use strict";

parserFactory.register("shitouxs.com", () => new ShitouxsParser());

class ShitouxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#listsss");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#TextContent");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#mlfy_main_text > h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookcover");
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".red");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".bookintromore")];
    }
}