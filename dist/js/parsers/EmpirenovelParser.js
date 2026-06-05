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

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div:nth-child(2) > div > span > a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div:nth-child(1) > ul a")]);
        let regex = new RegExp("^#");
        return tags.map(e => e.textContent.trim().replace(regex, "")).join(", ");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1:not(.show_title)");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [
            ...dom.querySelectorAll("div.col-sm.pe-sm-0 > div:nth-child(1)"),
            ...dom.querySelectorAll("div.bg_dark.p-3.my-2.rounded-3.show_details.max-sm-250.w-100")
        ];
    }
}
