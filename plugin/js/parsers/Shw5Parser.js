"use strict";

parserFactory.register("shw5.cc", () => new Shw5Parser());
parserFactory.register("bqka.cc", () => new Shw5Parser());

class Shw5Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.listmain");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#chaptercontent");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "a.ll, a.rr");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".intro")];
    }
}
