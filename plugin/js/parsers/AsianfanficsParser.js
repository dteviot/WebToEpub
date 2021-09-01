"use strict";

parserFactory.register("asianfanfics.com", () => new AsianfanficsParser());

class AsianfanficsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("aside ul");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div#user-submitted-body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1#story-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1#chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#bodyText");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#story-description, #story-foreword")];
    }
}
