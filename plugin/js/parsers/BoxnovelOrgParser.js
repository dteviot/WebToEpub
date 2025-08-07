"use strict";

//dead url/ parser
parserFactory.register("boxnovel.org", () => new BoxnovelOrgParser());

class BoxnovelOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = BoxnovelOrgParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = BoxnovelOrgParser.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            BoxnovelOrgParser.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a:not([rel])")];
        if (0 < paginateUrls.length) {
            let lastUrl = paginateUrls.pop().href;
            let index = lastUrl.lastIndexOf("=");
            let maxPage = parseInt(lastUrl.substring(index + 1));
            let prefix = lastUrl.substring(0, index + 1);
            for (let i = 2; i <= maxPage; ++i) {
                urls.push(`${prefix}${i}`);
            }
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("div#chr-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("a.chr-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.info"),
            dom.querySelector("div.desc-text"),
        ].filter(n => n != null);
    }
}
