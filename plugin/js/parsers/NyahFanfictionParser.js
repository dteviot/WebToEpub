"use strict";

parserFactory.register("fanfiction.com.br", () => new NyahFanfictionParser());

class NyahFanfictionParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.container_chapter_list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.historia");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.tooltip_userinfo");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#left_part");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.justify")];
    }
}