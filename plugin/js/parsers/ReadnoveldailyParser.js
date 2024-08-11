"use strict";

//dead url
parserFactory.register("readnoveldaily.com", () => new ReadnoveldailyParser());
parserFactory.register("allnovelbook.com", () => new ReadnoveldailyParser());

class ReadnoveldailyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    };

    getUrlsOfTocPages(dom) {
        let urls = []
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a:not([rel])")];
        if (0 < paginateUrls.length) {
            let url = new URL(paginateUrls.pop().href);
            let maxPage = url.searchParams.get("page");
            for(let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }
    
    extractPartialChapterList(dom) {
        let menu = [...dom.querySelectorAll("#viewchapter .row a")];
        return menu.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector(".c-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detail-post h2");
    }

    extractAuthor(dom) {
        return dom.querySelector(".author a")?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".m-desc .inner")];
    }
}
