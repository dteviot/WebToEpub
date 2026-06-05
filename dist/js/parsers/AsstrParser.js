"use strict";

//dead url/ parser
parserFactory.register("asstr.org", () => new AsstrParser());

class AsstrParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("body tbody");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("body pre");
    }

    extractTitleImpl(dom) {
        return [...dom.querySelectorAll("h1")].pop();
    }

    customRawDomToContentStep(chapter, content) {
        if (content.tagName.toLowerCase() === "pre") {
            util.convertPreTagToPTags(chapter.rawDom, content, "\n\n");
        }
    }
}
