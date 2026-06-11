"use strict";

parserFactory.register("wtnovels.com", () => new WtnovelsParser());

class WtnovelsParser extends WordpressBaseParser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            this.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("div.chapters-list a")]
            .map(link => ({
                sourceUrl: link.href,
                title: link.querySelector("h3").textContent,
                isIncludeable: link.querySelector(".chapter-paid-points") == null
            }));
    }

    getUrlsOfTocPages(dom) {
        let tocUrls = [];
        let link = [...dom.querySelectorAll("nav.cgl-pagination a.cgl-page")].pop()?.href;
        if (link) {
            let splitUrl = link.split("/");
            if (splitUrl.length >= 7) {
                let maxPage = parseInt(splitUrl[6]);
                for (let i = 2; i <= maxPage; ++i) {
                    splitUrl[6] = i;
                    tocUrls.push(splitUrl.join("/"));
                }
            }
        }
        return tocUrls;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel-header");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".novel-summary-initial")];
    }
}
