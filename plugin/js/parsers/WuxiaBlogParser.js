"use strict";

parserFactory.register("wuxia.blog", () => new WuxiaBlogParser());

class WuxiaBlogParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = WuxiaBlogParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = WuxiaBlogParser.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            WuxiaBlogParser.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("tbody#chapters");
        return util.hyperlinksToChapterList(menu);
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let paginationUrl = WuxiaBlogParser.getLastPaginationUrl(dom);
        if (paginationUrl !== null) {
            let index = paginationUrl.lastIndexOf("/");
            let maxPage = parseInt(paginationUrl.substring(index + 1));
            let prefix = paginationUrl.substring(0, index + 1);
            for (let i = 2; i <= maxPage; ++i) {
                urls.push(prefix + i);
            }
        }
        return urls;
    }

    static getLastPaginationUrl(dom) {
        let urls = [...dom.querySelectorAll("ul.pagination li a")];
        return (0 === urls.length) ? null : urls.pop().href;
    }

    findContent(dom) {
        return dom.querySelector("div.article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h4.panel-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "ul.pager, button, div.recently-nav, div.fb-like");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.imageCover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[itemprop='description']")];
    }
}
