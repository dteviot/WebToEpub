"use strict";

parserFactory.register("truyenyy.com", () => new TruyenyyParser());

class TruyenyyParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            TruyenyyParser.extractPartialChapterList,
            TruyenyyParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static extractPartialChapterList(dom) {
        let previousText = "";
        let mergedlinks = [];
        for (let l of dom.querySelectorAll("table.table a")) {
            if (l.className === "table-chap-title") {
                l.textContent = previousText + ": " + l.textContent.trim();
                mergedlinks.push(l);
            }
            previousText = l.textContent.trim();
        }
        return mergedlinks.map(a => util.hyperLinkToChapter(a));
    }

    static getUrlsOfTocPages(dom) {
        let pagination = dom.querySelector("ul.pagination");
        let tocUrls = [];
        if (pagination != null ) {
            let tocLinks = [...dom.querySelectorAll("a.page-link")]
                .map(a => a.href)
                .filter(href => href.includes("?p="));
            let maxPage = tocLinks
                .map(href => parseInt(href.split("?p=")[1]))
                .reduce((p, c) => Math.max(p, c), -1);
            if (1 < maxPage) {
                let base = tocLinks[0].split("?p=")[0];
                for (let i = 2; i <= maxPage; ++i) {
                    tocUrls.push(`${base}?p=${i}`);
                }
            }
        }
        return tocUrls;
    }

    findContent(dom) {
        return dom.querySelector("div#id_chap_content div.inner");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-info .name");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.novel-info .author a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div#id_chap_content .chapter-title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.novel-info img");
        return (img === null) ? img : img.getAttribute("data-src");
    }
}
