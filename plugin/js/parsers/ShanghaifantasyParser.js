"use strict";

parserFactory.register("shanghaifantasy.com", () => new ShanghaifantasyParser());

class ShanghaifantasyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = this.buildTocUrl(dom);
        let json = (await HttpClient.fetchJson(tocUrl)).json;
        return this.buildChapterUrls(json);
    }

    buildTocUrl(dom) {
        let category = dom.querySelector("ul#chapterList")?.getAttribute("data-cat");
        return `https://shanghaifantasy.com/wp-json/fiction/v1/chapters?category=${category}&order=asc&page=1&per_page=10000`;
    }

    buildChapterUrls(json) {
        return json.map(a => ({
            title: a.title,
            sourceUrl: a.permalink 
        }));
    }

    findContent(dom) {
        return dom.querySelector("div.contenta");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("title")?.textContent ?? null;;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".patreon1");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("title")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".flex-col");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#editdescription")];
    }
}
