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
        console.log("Total page input found:", input);
        if (input != null) {
            let totalp = parseInt(input.getAttribute("value"));
            console.log("Total pages:", totalp);
            console.log("Base URI:", dom.baseURI);
            for (let i = 2; i <= totalp; ++i ) {
                urls.push(`${dom.baseURI}trang-${i}/`);
            }
        }
        console.log("Generated ToC URLs:", urls);
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
