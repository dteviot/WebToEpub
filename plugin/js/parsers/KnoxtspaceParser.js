"use strict";

parserFactory.register("knoxt.space", () => new KnoxtspaceParser());

class KnoxtspaceParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(a => ({
                sourceUrl:  a.href,
                title: a.querySelector(".epl-num").textContent + " " + 
                a.querySelector(".epl-title").textContent,
            })).reverse();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.thumbook");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synp .entry-content")];
    }
}
