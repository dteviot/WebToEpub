"use strict";

parserFactory.register("buntls.com", function() { return new BuntlsParser(); });

class BuntlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2600;
    }

    async getChapterUrls(dom) {
        let all = [...dom.querySelectorAll("#chapter-group-unassigned a")];

        let chapters = all.map(a => ({
            sourceUrl: a.href, 
            title: a.textContent
        }));
        return chapters;
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".story__identity-title h1")?.textContent ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__identity-title, .story__summary content-section")];
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".story__thumbnail img")?.src ?? null;
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter__title");
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content");
    }

    removeUnwantedElementsFromContentElement(content) {
        let toremove = content.querySelectorAll("#load-content-button, .wpulike, script");
        for (let element of toremove) {
            element.remove();
        }
        this.makeHiddenElementsVisible(content);
        super.removeUnwantedElementsFromContentElement(content);
    }

    makeHiddenElementsVisible(content) {
        [...content.querySelectorAll("div")]
            .filter(e => (e.style.display === "none"))
            .forEach(e => e.removeAttribute("style"));
    }
}