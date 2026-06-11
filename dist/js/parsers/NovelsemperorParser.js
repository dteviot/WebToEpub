"use strict";

parserFactory.register("novelsemperor.com", () => new NovelsemperorParser());
parserFactory.register("novelsemperor.net", () => new NovelsemperorParser());

class NovelsemperorParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.walkTocPages(dom, 
            NovelsemperorParser.chaptersFromDom, 
            NovelsemperorParser.nextTocPageUrl, 
            chapterUrlsUI
        )).reverse();
    }

    static chaptersFromDom(dom) {
        return [...dom.querySelectorAll("#chapters-list a")]
            .map(NovelsemperorParser.hyperlinkToChapter);
    }

    static hyperlinkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link.querySelector("span").innerText.trim(),
        };
    }

    static nextTocPageUrl(dom) {
        let pagination = dom.querySelector("ul.pagination");
        if (pagination === null) {
            return null;
        }
        return [...pagination.querySelectorAll("li.pagination-link")]?.pop()
            ?.getAttribute("onclick")
            ?.split("'")?.[1]
            ?.replace("//", "https://");
    }

    findContent(dom) {
        return dom.querySelector("div.chap-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("#description").parentElement];
    }
}
