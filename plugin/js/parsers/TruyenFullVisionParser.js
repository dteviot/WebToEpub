"use strict";
parserFactory.register("truyenfull.vision", () => new TruyenFullVisionParser());

class TruyenFullVisionParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            TruyenFullVisionParser.extractPartialChapterList,
            TruyenFullVisionParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let input = dom.querySelector("input#total-page");
        if (!input) return urls;

        let totalp = parseInt(input.getAttribute("value"), 10);
        let current = new URL(dom.baseURI);

        // Remove any existing /trang-<n>/ suffix from pathname
        let basePath = current.pathname.replace(/\/trang-\d+\/?$/, "");
        if (!basePath.endsWith("/")) basePath += "/";

        for (let i = 2; i <= totalp; ++i) {
            let u = new URL(current); // clone
            u.hash = "";             // drop fragment
            u.search = "";           // drop query if you don't want it
            u.pathname = basePath + `trang-${i}/`;
            urls.push(u.toString());
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(link => util.hyperLinkToChapter(link));
    }


    findContent(dom) {
        return dom.querySelector("div.chapter-c");
    }
    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a[itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractDescription(dom) {
        return dom.querySelector(".desc-text").textContent.trim();
    }
    
    findChapterTitle(dom) {
        let title = dom.querySelector("a.chapter-title");
        return (title === null) ? super.findChapterTitle(dom) : title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text")];
    }
}
