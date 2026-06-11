"use strict";

//dead url/ parser
parserFactory.register("novelpassion.com", () => new NovelpassionParser());

class NovelpassionParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li a")]
            .map(this.linkToChapter)
            .filter(s => s !== null)
            .reverse();
    }

    linkToChapter(link) {
        let title = link.querySelector(".sp1");
        return title === null
            ? null
            : ({
                sourceUrl:  link.href,
                title: title.innerText.trim()
            });
    }

    findContent(dom) {
        return dom.querySelector("div#c_ct");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.psn h2");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.dac").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "i.g_thumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.g_txt_over")];
    }
}
