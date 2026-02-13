"use strict";

parserFactory.register("wenku8.net", () => new Wenku8Parser());

class Wenku8Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let id = Wenku8Parser.extractBookId(dom);
        let tocUrl = ` https://www.wenku8.net/modules/article/reader.php?aid=${id}`;
        let xhr = await HttpClient.wrapFetch(tocUrl, this.makeOptions());
        let menu = xhr.responseXML.querySelector("table");
        return util.hyperlinksToChapterList(menu);
    }

    static extractBookId(dom) {
        let path = new URL(dom.baseURI).pathname.split("/");
        return path[path.length - 1].split(".")[0];
    }

    findContent(dom) {
        return dom.querySelector("#contentmain");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("tbody td b").textContent;
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "ul#contentdp");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#content");
    }

    async fetchChapter(url) {
        // site does not tell us GBK is used to encode text
        let xhr = await HttpClient.wrapFetch(url, this.makeOptions());
        return xhr.responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("GBK")
        });
    }
}
