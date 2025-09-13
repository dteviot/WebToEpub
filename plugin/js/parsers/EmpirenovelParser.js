"use strict";

parserFactory.register("empirenovel.com", () => new EmpirenovelParser());

class EmpirenovelParser extends Parser { // eslint-disable-line no-unused-vars
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

    getUrlsOfTocPages(dom) {
        let urls = [];
        let indices = [...dom.querySelectorAll(".pagination a")]
            .map(item => new URL(item?.href)?.searchParams?.get("page"))
            .filter(item => item !== null)
            .map(item => parseInt(item));
        if (0 < indices.length) {
            let urlbuilder = new URL(dom.querySelector(".pagination a").href);
            let lastIndex = Math.max(...indices);
            for (let i = 2; i <= lastIndex; ++i) {
                urlbuilder.searchParams.set("page", i);
                urls.push(urlbuilder.href);
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("a.chapter_link")]
            .map((link) => {
                link.querySelector(".small")?.remove();
                return ({
                    sourceUrl: link.href,
                    title: link.innerText.trim(),
                });
            });
    }

    findContent(dom) {
        return dom.querySelector("#read-novel");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1:not(.show_title)");
    }

    // Optional, supply if individual chapter titles are not inside the content element
    /*
    findChapterTitle(dom) {
        // typical implementation is find node with the Title
        // Return Title element, OR the title as a string
        return dom.querySelector("h3.dashhead-title");
    }
    */

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("dl")];
    }
}
