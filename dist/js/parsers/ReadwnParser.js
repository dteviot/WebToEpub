"use strict";

parserFactory.register("fannovel.com", () => new ReadwnParser());
parserFactory.register("fannovels.com", () => new ReadwnParser());
parserFactory.register("fansmtl.com", () => new ReadwnParser());
parserFactory.register("fanmtl.com", () => new ReadwnParser());
parserFactory.register("novelmt.com", () => new ReadwnParser());
parserFactory.register("novelmtl.com", () => new ReadwnParser());
parserFactory.register("readwn.com", () => new ReadwnParser());
parserFactory.register("wuxiabee.com", () => new ReadwnParser());
parserFactory.register("wuxiabee.net", () => new ReadwnParser());
parserFactory.register("wuxiabee.org", () => new ReadwnParser());
parserFactory.register("wuxiafox.com", () => new ReadwnParser());
parserFactory.register("wuxiago.com", () => new ReadwnParser());
parserFactory.register("wuxiahere.com", () => new ReadwnParser());
parserFactory.register("wuxiahub.com", () => new ReadwnParser());
parserFactory.register("wuxiamtl.com", () => new ReadwnParser());
parserFactory.register("wuxiaone.com", () => new ReadwnParser());
parserFactory.register("wuxiap.com", () => new ReadwnParser());
//dead url
parserFactory.register("wuxiapub.com", () => new ReadwnParser());
parserFactory.register("wuxiaspot.com", () => new ReadwnParser());
parserFactory.register("wuxiar.com", () => new ReadwnParser());
parserFactory.register("wuxiau.com", () => new ReadwnParser());
parserFactory.register("wuxiazone.com", () => new ReadwnParser());

parserFactory.registerRule(
    (url, dom) => ReadwnParser.isReadwn(dom) * 0.8,
    () => new ReadwnParser()
);

class ReadwnParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    static isReadwn(dom) {
        return (dom.querySelector(ReadwnParser.CoverSelector) !== null)
            && (dom.querySelector(ReadwnParser.AuthorSelector) !== null);
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            ReadwnParser.extractPartialChapterList,
            ReadwnParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static getUrlsOfTocPages(dom) {
        let tocLinks = [...dom.querySelectorAll("ul.pagination li a")]
            .map(l => new URL(l.href))
            .filter(l => l.search.includes("page"));
        let pageIds = tocLinks.map(l => parseInt(l.searchParams.get("page")));
        let maxPage = Math.max(...pageIds);
        let baseUrl = tocLinks[0];
        let urls = [];
        for (let i = 1; i <= maxPage; ++i) {
            let params = baseUrl.searchParams;
            params.set("page", i);
            baseUrl.search = params.toString();
            urls.push(baseUrl.href);
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.chapter-list a")]
            .map(link => ({
                sourceUrl:  link.href,
                title: ReadwnParser.makeTitle(link)
            }));
    }

    static makeTitle(link) {
        let num = link.querySelector(".chapter-no").textContent.trim();
        let title = link.querySelector(".chapter-title").textContent.trim();
        return title.includes(num)
            ? title
            : num + ": " + title;
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.main-head h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(ReadwnParser.AuthorSelector);
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".adsbox");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ReadwnParser.CoverSelector);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".summary .content")];
    }
}

ReadwnParser.CoverSelector = "figure.cover";
ReadwnParser.AuthorSelector = "span[itemprop='author']";
