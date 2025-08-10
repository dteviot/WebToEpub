"use strict";

//dead url/ parser
parserFactory.register("novelhold.com", () => new NovelholdParser());

class NovelholdParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div#morelist");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".detail p")
            ?.textContent?.split("：")[1];
        return authorLabel ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookimg");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".content")];
    }
}
