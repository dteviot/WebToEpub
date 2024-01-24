"use strict";

parserFactory.register("cyborg-tl.com", () => new CyborgParser());

class CyborgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.lightnovel-episode a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    findContent(dom) {
        return (
            dom.querySelector(".entry-content") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("strong");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.lightnovel-thumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.lightnovel-synopsis")];
    }

    removeUnwantedElementsFromContentElement(element) {
        let mark = element.querySelector("#hpk");
        mark.nextElementSibling.remove();
        mark.remove()
        super.removeUnwantedElementsFromContentElement(element);
    }
}



