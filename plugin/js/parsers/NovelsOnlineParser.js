"use strict";

parserFactory.register("novelsonline.net", () => new NovelsOnlineParser());

class NovelsOnlineParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-chs a")]
            .map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.textContent,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("div#contentall")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector(".novel-right .novel-detail-body")];
    }
}