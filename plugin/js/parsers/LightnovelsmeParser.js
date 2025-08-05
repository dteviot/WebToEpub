"use strict";

//dead url/ parser
parserFactory.register("lightnovels.me", () => new LightnovelsmeParser());
//dead url
parserFactory.register("pandapama.com", () => new LightnovelsmeParser());
//dead url
parserFactory.register("lightnovels.live", () => new LightnovelsmeParser());

class LightnovelsmeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.chapter-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("main div.overflow-hidden")];
    }
}
