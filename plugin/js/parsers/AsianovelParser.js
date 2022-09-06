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
        let articles = [...dom.querySelectorAll("article")];
        return (articles.length === 1)
            ? articles[0]
            : articles[1];
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".summary-classic__content .title a");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary-classic__text")];
    }
}
