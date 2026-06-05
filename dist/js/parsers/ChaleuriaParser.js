"use strict";

parserFactory.register("chaleuria.com", () => new ChaleuriaParser());

class ChaleuriaParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rows = dom.querySelectorAll("table.toctable tr.tocrow");
        if (rows.length>0) {
            return [...rows].map(row => this.rowToChapter(row));
        }
        else {
            let menu = dom.querySelector(".entry-content");
            return util.hyperlinksToChapterList(menu);
        }
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
        return dom.querySelector(".entry-content, div.elementor-widget-theme-post-content div.elementor-widget-container");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title, h1.elementor-heading-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title, h1.elementor-heading-title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content p, div.elementor-widget-theme-post-content div.elementor-widget-container p")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "img");
    }
}
