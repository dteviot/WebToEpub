"use strict";

parserFactory.register("uaa.com", () => new UaaParser());

class UaaParser extends Parser {
    constructor() {
        super();

        this.minimumThrottle = 3000; //Might not be necessary, but keeping it just to be safe.
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".catalog_ul");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".article");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".dizhi");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".title_box h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover"); // Cover Image is hidden being an API call. 
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info_box > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info_box > div:nth-child(4) > a:nth-child(1)");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector("div.txt").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".detail_box")];
    }
}
