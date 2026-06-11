"use strict";

//dead url/ parser
parserFactory.register("noveltranslatedbyc.blogspot.com", () => new NoveltranslatedbycParser());

class NoveltranslatedbycParser extends BlogspotParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("article button")]
            .map(NoveltranslatedbycParser.buttonToChapter);
    }

    static buttonToChapter(button) {
        let onClick = button.getAttribute("onclick") || "";
        let start = onClick.indexOf("https");
        let end = onClick.lastIndexOf("'");
        let sourceUrl = "";
        if (start !== -1 && end !== -1) {
            sourceUrl = onClick.substring(start, end);
        } else {
            let link = button.querySelector("a") || button.closest("a");
            sourceUrl = link ? (link.getAttribute("href") || link.href) : "";
        }
        return {
            title: button.textContent.trim(),
            sourceUrl:  sourceUrl,
        };
    }

    findContent(dom) {
        return dom.querySelector("article center");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }
}
