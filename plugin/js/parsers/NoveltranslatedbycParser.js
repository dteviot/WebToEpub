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
        let onClick = button.getAttribute("onclick");
        let start = onClick.indexOf("https");
        let end = onClick.lastIndexOf("'");
        return {
            title: button.textContent.trim(),
            sourceUrl:  onClick.substring(start, end),
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
