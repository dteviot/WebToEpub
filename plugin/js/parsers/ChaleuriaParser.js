"use strict";

parserFactory.register("chaleuria.com", () => new ChaleuriaParser());

class ChaleuriaParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rows = [...dom.querySelectorAll("table.toctable tr.tocrow")]
            .map(this.rowToChapter);
        return rows;
    }
    
    rowToChapter(row) {
        let title = row.querySelector("td.toctitle").textContent;
        let link = row.querySelector("button").getAttribute("formaction");
        return {
            sourceUrl:  link,
            title: title
        };        
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content p")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "img");
    }
}
