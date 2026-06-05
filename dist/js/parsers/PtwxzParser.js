"use strict";

parserFactory.register("piaotia.com", () => new PtwxzParser());

class PtwxzParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("#content table tbody tr td table caption a").href;
        let tocDom = await this.fetchChapter(tocUrl);
        let table = tocDom.querySelector("div.centent");
        return util.hyperlinksToChapterList(table);
    }

    findContent(dom) {
        return dom.querySelector("body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#content table table table h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "#guild, #shop, .toplink, table, #feit2, #Commenddiv, .bottomlink");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        // site does not tell us gbk is used to encode text
        let options = { makeTextDecoder: () => new TextDecoder("gbk") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("#content table table a:not([tiptitle]) img")?.src ?? null;
    }
}
