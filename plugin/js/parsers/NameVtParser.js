"use strict";

parserFactory.register("namevt.com", () => new NameVtParser());

class NameVtParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    extractAuthor(dom) {
        let authorRow = Array.from(dom.querySelectorAll("div.serl")).find(
            (row) => row.querySelector(".sername")?.textContent.trim() === "Yazar"
        );
        let authorLink = authorRow?.querySelector(".serval a");
        return authorLink ? authorLink.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.sertothumb");
    }

    extractLanguage() {
        return "tr";
    }

    findContent(dom) {
        return dom.querySelector("div.nvtread.epcontent.entry-content");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        let titleHeading = element.querySelector(":scope > h2");
        if (titleHeading) {
            titleHeading.remove();
        }
    }

    getChapterUrls(dom) {
        let chapterLinks = dom.querySelectorAll(
            "div.ts-chl-collapsible-content ul li a"
        );
        let chapters = Array.from(chapterLinks).map((link) => {
            let number = link.querySelector(".epl-num")?.textContent.trim() ?? "";
            let title = link.querySelector(".epl-title")?.textContent.trim() ?? "";
            return {
                sourceUrl: link.href,
                title: title ? `${number} - ${title}` : number
            };
        });

        
        return chapters.reverse();
    }
}