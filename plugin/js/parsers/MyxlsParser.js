"use strict";

parserFactory.register("myxls.net", () => new MyxlsParser());

class MyxlsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rows = dom.querySelector("div#list dl").children;
        let links = [];
        let count = 0;
        for (let row of rows) {
            let tag = row.tagName.toLowerCase();
            if (tag === "dt") {
                ++count;
            }
            if ((tag === "dd") && (count === 2)) {
                links.push(row.querySelector("a"));
            }
        }
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".bookname h1")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#intro")];
    }
}
