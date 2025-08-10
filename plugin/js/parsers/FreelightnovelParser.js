"use strict";

//dead url/ parser
parserFactory.register("freelightnovel.net", () => new FreelightnovelParser());
//dead url
parserFactory.register("m.freelightnovel.net", () => new MFreelightnovelParser());

class FreelightnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div#list a")]
            .filter(a => a.parentNode.parentNode.id !== "newchapter")
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return [...dom.querySelectorAll(".con_top a")].pop()?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#intro")];
    }
}

class MFreelightnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#chapterlist");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#BookText");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("p.title")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".baseinfo");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".intro")];
    }
}
