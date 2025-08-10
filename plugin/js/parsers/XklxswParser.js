"use strict";

//dead url/ parser
parserFactory.register("m.xklxsw.net", () => new XklxswParser());

class XklxswParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#allChapters2");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#nr");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".cover h2 a");
    }
    findChapterTitle(dom) {
        return dom.querySelector("#nr_title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".intro_info")];
    }
}
