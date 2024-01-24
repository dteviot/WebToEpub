"use strict";

parserFactory.register("cyborg-tl.com", function () {return new CyborgParser();});

class CyborgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return ([...dom.querySelectorAll("div.lightnovel-episode a")]
            .map(link => ({
                sourceUrl: link.href,
                title: link.title,
            }))).reverse();
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
        let mark = [...element.querySelectorAll("#hpk")];
        mark[0].nextElementSibling.remove();
        mark[0].remove()
        super.removeUnwantedElementsFromContentElement(element);
    }
}



