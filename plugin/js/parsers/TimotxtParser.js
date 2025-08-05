"use strict";

parserFactory.register("timotxt.com", () => new TimotxtParser());

class TimotxtParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.baseURI + "dir";
        let tocDom =  (await HttpClient.fetchHtml(tocUrl)).responseXML;
        let menu = tocDom.querySelector("ul.all");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        return dom.querySelector("#detail span.author")?.textContent ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#detail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".intro")];
    }
}
