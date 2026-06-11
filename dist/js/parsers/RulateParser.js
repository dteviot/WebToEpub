"use strict";

//dead url/ parser
parserFactory.register("tl.rulate.ru", () => new RulateParser());

class RulateParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rows = dom.querySelectorAll(".chapter_row");
        rows = [...rows].filter(row => !row.querySelector("[data-price]"));
        return rows.map(row => util.hyperLinkToChapter(row.querySelector(".t a")));
    }

    findContent(dom) {
        return dom.querySelector(".content-text");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Автор:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextElementSibling.textContent;
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractDescription(dom) {
        return dom.querySelector("meta[property=\"ranobe:description\"]").getAttribute("content");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#slick-slide00") || util.getFirstImgSrc(dom, ".slick");
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
}
