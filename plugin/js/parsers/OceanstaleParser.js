"use strict";

parserFactory.register("oceanstale.com", () => new OceanstaleParser());

class OceanstaleParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.chapter-list");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            ".chapter-nav, #chapter-dropdown, .darkmode-toggle-container, #font-size-controls, .post-navigation");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bs-blog-thumb");
    }

    extractAuthor(dom) {
        let author = dom.querySelector(".bs-author");
        return author?.textContent.trim().replace(/^By\s+/i, "") ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return [...dom.querySelectorAll(".blogdata-tags.tag-links a")]
            .map(a => a.textContent.trim())
            .join(", ");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article p")];
    }

    extractDescription(dom) {
        return [...dom.querySelectorAll("article p")]
            .map(p => p.textContent.trim())
            .filter(text => text.length > 0)
            .join("\n\n");
    }
}
