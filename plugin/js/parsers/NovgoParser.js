"use strict";

parserFactory.register("novgo.net", () => new NovgoParser());

class NovgoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    extractPartialChapterList(dom) {
        let menu = dom.querySelector("ul#idData");
        return util.hyperlinksToChapterList(menu);
    }

    getUrlsOfTocPages(dom) {
        let options = [...dom.querySelectorAll("#indexselect option")];
        // first option is the page already parsed
        return options.slice(1).map(o => new URL(o.dataset.url, dom.baseURI).href);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tit");
    }

    extractAuthor(dom) {
        let link = dom.querySelector("a[href*='/author/']");
        return link ? link.textContent.trim() : super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("a[href*='/genre/']")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        let element = dom.querySelector("#novel-summary-inner");
        return element ? element.textContent.trim() : super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic");
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }
    findChapterTitle(dom) {
    return dom.querySelector("span.chapter-title");
    }
}
