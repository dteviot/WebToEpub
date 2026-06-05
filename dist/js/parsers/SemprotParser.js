"use strict";

parserFactory.register("semprot.com", () => new SemprotParser());

class SemprotParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        SemprotParser.author = this.findContent(dom)
            .querySelector("article.message")
            .getAttribute("data-Author");
        let baseUri = dom.baseURI;
        let chapters = [this.makeChapter(baseUri, "1")];
        let max = this.lastThreadPageNum(dom);
        for (let i = 2; i <= max; ++i) {
            chapters.push(this.makeChapter(baseUri, i));
        }
        return chapters;
    }

    lastThreadPageNum(dom) {
        let pageUrls = [...dom.querySelectorAll("li.pageNav-page")];
        return (0 < pageUrls.length)
            ? parseInt(pageUrls.pop().textContent)
            : 0;
    }

    makeChapter(baseUrl, pageNum) {
        return {
            sourceUrl:  `${baseUrl}page-${pageNum}`,
            title: `${pageNum}`
        };
    }

    findContent(dom) {
        return [...dom.querySelectorAll("div.block-container")]
            .filter(b => b.querySelector("article"))
            .pop();
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".p-title-value");
    }

    extractAuthor(dom) {
        let authorLabel = SemprotParser.author;
        return (authorLabel == null) ? super.extractAuthor(dom) : authorLabel;
    }

    preprocessRawDom(webPageDom) {
        let articles = [...webPageDom.querySelectorAll("article.message")];
        for (let article of articles) {
            if (article.getAttribute("data-author") !== SemprotParser.author) {
                article.remove();
            } else {
                let body = article.querySelector("article.message-body");
                util.removeChildElementsMatchingSelector(body, ".bbCodeBlock-expandLink, .semprotnenenmontok_sq");
                util.resolveLazyLoadedImages(body, "img");
                article.replaceWith(body);
            }
        }
    }
}
