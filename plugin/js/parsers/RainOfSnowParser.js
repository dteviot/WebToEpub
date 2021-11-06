"use strict";

parserFactory.register("rainofsnow.com", () => new RainOfSnowParser());

class RainOfSnowParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div#chapter");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        let content = dom.querySelector("div.zoomdesc-cont");
        util.fixDelayLoadedImages(content, "data-src");
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".container h2");
    }

    findChapterTitle(dom) {
        return dom.querySelector("li.menu-toc-current")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".imagboca1 img");
        return img?.getAttribute("data-src");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#synop")];
    }
}
