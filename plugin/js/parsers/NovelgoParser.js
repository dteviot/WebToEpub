"use strict";

parserFactory.register("novelgo.id", () => new NovelgoParser());

class NovelgoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let path = new URL(dom.baseURI).pathname.split("/").filter(p => p !== "");
        let category = path[path.length - 1];
        let url = "https://novelgo.id/wp-json/noveils/v1/chapters?paged=1&perpage=10000&category=" + category;
        let json = (await HttpClient.fetchJson(url)).json;
        return json.map(this.jsonToChapter);
    }

    jsonToChapter(json) {
        let title = json.post_title;
        let index = title.indexOf("Chapter");
        if (0 < index) {
            title = title.substring(index);
        }
        return {
            sourceUrl: json.permalink,
            title: title.replace("&#8211", "-"),
            newArc: null
        };
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-post-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "ins, div.code-block-label, .code-block");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter-post-title");
    }

    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.novel-thumbnail");
        return util.extractUrlFromBackgroundImage(div);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#noveils-about-tab .line-height-30 p")];
    }
}
