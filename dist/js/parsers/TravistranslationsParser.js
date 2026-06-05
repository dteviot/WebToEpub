"use strict";

//dead url/ parser
parserFactory.register("travistranslations.com", () => new TravistranslationsParser());

class TravistranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("section.mb-4 ul.grid a")]
            .map(a => ({
                sourceUrl:  a.href,
                title: a.querySelector("span").textContent.trim()
            }));
    }

    findContent(dom) {
        return dom.querySelector("div.reader-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1[title]");
    }

    findChapterTitle(dom) {
        let h2 = dom.querySelector("div.header h2");
        let span = h2.parentElement.querySelector("span")?.textContent ?? "";
        return h2.textContent + " " + span;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#primary .container")
            ?.replace("q=55", "q=100") ?? null;
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "img");
        this.addAuthorNotes(webPageDom);
    }

    addAuthorNotes(webPageDom) {
        let content = this.findContent(webPageDom); 
        for (let n of [...content.parentElement.querySelectorAll("div.py-1")]) {
            content.append(n);
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[property='description']")];
    }
}
