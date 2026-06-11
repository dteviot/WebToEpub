"use strict";

parserFactory.register("worldnovel.online", () => new WorldnovelOnlineParser());

class WorldnovelOnlineParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let category = dom.body.getAttribute("attr");
        let numTocPages = [...dom.querySelectorAll("div[data-paged]")].length;
        for (let page = 1; page <= numTocPages; ++page) {
            let url = "https://www.worldnovel.online/wp-json/novel-id/v1/dapatkan_chapter_dengan_novel?category=" + 
                category + "&perpage=100&order=ASC&paged=" + page;
            let partialList = (await HttpClient.fetchJson(url)).json
                .map(this.jsonToChapter);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
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
        util.removeChildElementsMatchingSelector(element, ".code-block, ins, .chapternav, a[href='javascript:void(0)']");
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
