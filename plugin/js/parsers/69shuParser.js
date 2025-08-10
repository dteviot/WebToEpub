"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).includes("69shu")),
    () => new ShuParser()
);
parserFactory.register("69yuedu.net", () => new _69yueduParser());

class ShuParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.more-btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#catalog ul");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.txtnav");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.booknav2 h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookbox");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelectorAll(".booknav2 a")[1];
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".txtinfo, #txtright, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }
}

class _69yueduParser extends ShuParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#chapters ul");
        return util.hyperlinksToChapterList(menu);
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }
}
