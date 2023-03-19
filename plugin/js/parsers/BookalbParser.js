"use strict";

parserFactory.register("bookalb.com", () => new BookalbParser());

class BookalbParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    };

    getUrlsOfTocPages(dom) {
        let tocUrls = [];
        let tocLinks = [...dom.querySelectorAll("a.page-numbers:not(.next)")]
            .map(a => a.href);
        if (0 < tocLinks.length) {
            let maxPageUrl = tocLinks.pop();
            let index = maxPageUrl.lastIndexOf("/", maxPageUrl.length - 2);
            let base = maxPageUrl.substring(0, index + 1);
            let maxPage = parseInt(maxPageUrl.substring(index + 1));
            if (1 < maxPage) {
                for(let i = 2; i <= maxPage; ++i) {
                    tocUrls.push(`${base}${i}/`);
                }
            }
        }
        return tocUrls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("h2.entry-title a")]
            .map(a => util.hyperLinkToChapter(a))
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.page-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#primary");
    }
}
