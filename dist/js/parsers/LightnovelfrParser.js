"use strict";

parserFactory.register("lightnovelfr.com", () => new LightnovelfrParser());

class LightnovelfrParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".eplister a")]
            .map(this.linkToChapter)
            .reverse();
    }

    linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector(".epl-num").textContent + " " + link.querySelector(".epl-title").textContent
        });
    }

    findContent(dom) {
        return dom.querySelector(".entry-content")
            || dom.querySelector(".postbody");
    }

    findChapterTitle(dom) {
        let epheader = dom.querySelector(".epheader");
        if (epheader !== null) {
            let h1 = epheader.querySelector("h1");
            let cat = epheader.querySelector(".cat-series");
            return h1.textContent + " " + cat.textContent;
        }
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".sertothumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".sersys")];
    }
}
