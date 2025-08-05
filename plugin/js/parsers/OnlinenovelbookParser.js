"use strict";

//dead url/ parser
parserFactory.register("onlinenovelbook.com", () => new OnlinenovelbookParser());

class OnlinenovelbookParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        let paginationUrl = OnlinenovelbookParser.getLastPaginationUrl(dom);
        if (paginationUrl === null) {
            return super.getChapterUrls(dom);
        }
        return this.getChapterUrlsFromMultipleTocPages(dom,
            OnlinenovelbookParser.extractPartialChapterList,
            OnlinenovelbookParser.getUrlsOfTocPages,
            chapterUrlsUI
        ).then(c => c.reverse());
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let paginationUrl = OnlinenovelbookParser.getLastPaginationUrl(dom);
        let maxPage = parseInt(util.extractSubstring(paginationUrl, "/page/", "/"));
        let index = paginationUrl.indexOf("/page/") + 6;
        let prefix = paginationUrl.substring(0, index);
        for (let i = 2; i <= maxPage; ++i) {
            urls.push(prefix + i +"/");
        }
        return urls;
    }

    static getLastPaginationUrl(dom) {
        let urls = [...dom.querySelectorAll("div.ast-pagination a:not(.next)")];
        return (0 === urls.length) ? null : urls.pop().href;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("h2.entry-title a")]
            .map(a => util.hyperLinkToChapter(a));
    }
}
