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

    customRawDomToContentStep(chapter, content) {
        [...content.querySelectorAll("div.line")]
            .forEach(this.divToP);
    }

    divToP(div) {
        let p = document.createElement("p");
        p.textContent = div.textContent;
        div.replaceWith(p);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".dizhi");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".title_box h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel_box");
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("div.item:nth-child(5) a")];
        let tags = [...dom.querySelectorAll(".tag_box li a")];
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info_box > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info_box > div:nth-child(4) a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector("div.txt").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".detail_box")];
    }
}
