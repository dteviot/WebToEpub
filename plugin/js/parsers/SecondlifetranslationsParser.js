"use strict";

parserFactory.register("secondlifetranslations.com", () => new SecondlifetranslationsParser());

class SecondlifetranslationsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("button.accordion").nextElementSibling;
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.novelcover");
        return img === null ? null : img.src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-entry-content")];
    }
}
