"use strict";

parserFactory.register("truyennhabo.com", () => new TruyenParser());

class TruyenParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const chapterLinks = [...dom.querySelectorAll("#clwd ul a")];
        const chapterTitles = [...dom.querySelectorAll("#clwd span.block")];
        const chapterUrls = [];
        for (let i = 0; i < chapterLinks.length; i++) {
            const chapterLink = chapterLinks[i];
            const chapterTitle = chapterTitles[i];
            chapterUrls.push({
                sourceUrl: chapterLink.href,
                title: chapterTitle.textContent,
            });
        }
        return chapterUrls.reverse();
    }

    findContent(dom) {
        return (
            dom.querySelector("article.blog")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#extra-info dd");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("header h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.auto-rows-max");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#synopsis")];
    }

    removeUnwantedElementsFromContentElement(element) {
        let mark = element.querySelector("a");
        mark.remove();
        super.removeUnwantedElementsFromContentElement(element);
    }

}



