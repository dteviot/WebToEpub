"use strict";

parserFactory.register("wuxia.blog", () => new WuxiaBlogParser());

class WuxiaBlogParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = WuxiaBlogParser.extractPartialChapterList(dom);
        let paginationUrl = WuxiaBlogParser.getLastPaginationUrl(dom);
        if (paginationUrl !== null) {
            chapterUrlsUI.showTocProgress(chapters);
            let tocPageUrls = WuxiaBlogParser.getUrlsOfTocPages(paginationUrl);
            for(let url of tocPageUrls) {
                let newDom = (await HttpClient.wrapFetch(url)).responseXML;
                let partialList = WuxiaBlogParser.extractPartialChapterList(newDom);
                chapterUrlsUI.showTocProgress(partialList);
                chapters = chapters.concat(partialList);            
            }
        }
        return chapters.reverse();
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("tbody#chapters");
        return util.hyperlinksToChapterList(menu);
    }

    static getUrlsOfTocPages(paginationUrl) {
        let urls = [];
        let index = paginationUrl.lastIndexOf("/");
        let maxPage = parseInt(paginationUrl.substring(index + 1));
        let prefix = paginationUrl.substring(0, index + 1)
        for(let i = 2; i <= maxPage; ++i) {
            urls.push(prefix + i);
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
        util.removeChildElementsMatchingCss(element, "ul.pager, button, div.recently-nav, div.fb-like");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.imageCover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[itemprop='description']")];
    }
}
