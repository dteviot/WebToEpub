"use strict";

parserFactory.register("kanunu8.com", () => new Kanunu8Parser());

class Kanunu8Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".mulu-list");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#neirong");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".catalog h1");
    }

    extractAuthor(dom) {
        let author = dom.querySelector(".catalog .info");
        if (author) {
            return author.textContent.replace(/^作者：/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    extractDescription(dom) {
        let description = dom.querySelector(".intro");
        return description ? description.textContent.trim() : "";
    }

    async fetchChapter(url) {
        let options = {
            makeTextDecoder: () => new TextDecoder("gbk")
        };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }
}
