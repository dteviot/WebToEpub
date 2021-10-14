"use strict";

parserFactory.register("asianovel.net", () => new AsianovelParser());

class AsianovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            AsianovelParser.extractPartialChapterList,
            AsianovelParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    };

    static getUrlsOfTocPages(dom) {
        let urls = []
        let lastLink = [...dom.querySelectorAll(".summary__container .pagination a")]
            .slice(-1);
        if (0 < lastLink.length)
        {
            let max = parseInt(lastLink[0].textContent);
            let href = lastLink[0].href;
            let index = href.lastIndexOf("/", href.length - 2);
            href = href.substring(0, index + 1);
            for(let i = 2; i <= max; ++i) {
                urls.push(href + i + "/");
            }
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll(".summary__container .title a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".summary-classic__content .title a");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }
}
