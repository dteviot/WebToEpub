"use strict";

parserFactory.register("lightnovelworld.com", () => new LightNovelWorldParser());

class LightNovelWorldParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = LightNovelWorldParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = LightNovelWorldParser.getUrlsOfTocPages(dom);
        return (await Parser.getChaptersFromAllTocPages(tocPage1chapters,
            LightNovelWorldParser.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.chapter-list a")]
            .map(LightNovelWorldParser.linkToChapterIfo);
    }

    static linkToChapterIfo(link) {
        let chaperNo = link.querySelector("span.chapter-no").textContent.trim();
        let title = link.querySelector("h6.chapter-title").textContent.trim();
        return {
            sourceUrl:  link.href,
            title: `${chaperNo}: ${title}`,
            newArc: null
        };
    }

    static getUrlsOfTocPages(dom) {
        let urls = []
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a")];
        if (0 < paginateUrls.length) {
            let lastUrl = paginateUrls.pop().href;
            let index = lastUrl.lastIndexOf("/");
            let maxPage = parseInt(lastUrl.substring(index + 1));
            let prefix = lastUrl.substring(0, index + 1)
            for(let i = 2; i <= maxPage; ++i) {
                urls.push(`${prefix}${i}?X-Requested-With=XMLHttpRequest`);
            }
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-info h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.header-body");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-info, section#info")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "nav.links");
    }
}
