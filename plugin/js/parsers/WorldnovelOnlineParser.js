"use strict";

parserFactory.register("worldnovel.online", () => new WorldnovelOnlineParser());

class WorldnovelOnlineParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let category = dom.body.getAttribute("attr");
        let url = "https://www.worldnovel.online/wp-json/novel-id/v1/dapatkan_chapter_dengan_novel?category=" + 
            category + "&perpage=10000&order=ASC&paged=1";
        let json = (await HttpClient.fetchJson(url)).json;
        return json.map(this.jsonToChapter);
    }

    jsonToChapter(json) {
        return {
            sourceUrl: json.permalink,
            title: json.post_title,
            newArc: null
        };
    }

    findContent(dom) {
        return dom.querySelector("div#soop");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("li.breadcrumb-item.active");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".code-block, ins, .chapternav, a[href='javascript:void(0)']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3.post-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main#main div.container");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#maintab div.post-content")];
    }
}
