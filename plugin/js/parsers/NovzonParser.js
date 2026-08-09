"use strict";

parserFactory.register("novzon.net", () => new NovzonParser());

class NovzonParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-title");
    }

    extractAuthor(dom) {
        let authorLink = dom.querySelector("a.author-tag");
        return authorLink ? authorLink.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover-wrapper");
    }

    extractLanguage() {
        return "tr";
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-content");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        util.removeElements(element.querySelectorAll(
            "#chapter-content-end-sentinel, #zen-spacer"
        ));
    }

    getChapterUrls(dom) {
        let chapterLinks = dom.querySelectorAll("div.chapter-list-grid a.chapter-item");
        return Array.from(chapterLinks).map((link) => {
            let numberElement = link.querySelector("span.chapter-number");
            let titleElement = link.querySelector("div.chapter-title");
            let number = numberElement ? numberElement.textContent.trim() : "";
            let title = titleElement ? titleElement.textContent.trim() : "";
            return {
                sourceUrl: link.href,
                title: [number, title].filter((part) => part).join(" - ")
            };
        });
    }
}