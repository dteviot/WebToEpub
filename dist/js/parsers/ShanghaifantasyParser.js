"use strict";

parserFactory.register("shanghaifantasy.com", () => new ShanghaifantasyParser());

class ShanghaifantasyParser extends Parser {
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
        let content = dom.querySelector("div.contenta");
        let childCount = content.querySelectorAll("div, p").length;
        return (childCount <= 3)
            ? dom.querySelector("body > div.flex")
            : content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("title")?.textContent ?? null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".patreon1, section, nav, button, template, #comments, footer, .hideme");

        for (let e of [...element.querySelectorAll("div")]) {
            e.removeAttribute(":style");
            e.removeAttribute(":class");
            e.removeAttribute("@click.outside");
        }

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
