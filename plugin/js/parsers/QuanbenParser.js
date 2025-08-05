"use strict";

parserFactory.register("quanben.io", () => new QuanbenParser());

class QuanbenParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (!dom.baseURI.endsWith("/list.html")) {
            let tocUrl = dom.baseURI + "/list.html";
            dom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        }
        return [...dom.querySelectorAll("div.box li a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitleImpl(dom) {
        let span = dom.querySelector("span[itemprop='name']");
        return span === null ? null : span.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.headline");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div[itemscope]");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description")];
    }
}
