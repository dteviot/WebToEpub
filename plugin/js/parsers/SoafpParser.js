"use strict";

parserFactory.register("soafp.com", () => new SoafpParser());

class SoafpParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".novel-chapter-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    extractAuthor() {
        //The site doesn't provide any author for books, so we're just using the TL
        return "Soafp";
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("#novel-genres-list a")];
        let tags = [...dom.querySelectorAll("#novel-tags-list a")]; 
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".entry-synopsis").textContent.trim();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".post-thumbnail");
    }
}