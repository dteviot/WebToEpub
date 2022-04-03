"use strict";

parserFactory.register("teanovel.com", () => new TeanovelParser());

class TeanovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let storyName = new URL(dom.baseURI).pathname.split("/").pop();
        let baseUrl = dom.baseURI;
        let baseTocUrl = `https://www.teanovel.com/api/chapters/${storyName}?slug=${storyName}&orderBy=asc`;
        let json = (await HttpClient.fetchJson(baseTocUrl)).json;
        let chapters = TeanovelParser.jsonToChapter(json, baseUrl);
        chapterUrlsUI.showTocProgress(chapters);
        let url = TeanovelParser.nextTocPageUrl(baseTocUrl, json);
        while (url != null) {
            json = (await HttpClient.fetchJson(url)).json;
            let partialList = TeanovelParser.jsonToChapter(json, baseUrl);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            url = TeanovelParser.nextTocPageUrl(baseTocUrl, json);
        }
        return chapters;
    }

    static jsonToChapter(json, baseUrl) {
        return json.data.map(d => ({
            sourceUrl: baseUrl + "/" + d.slug, 
            title: `C${d.order} - ${d.title}`
        }));
    }

    static nextTocPageUrl(baseTocUrl, json) {
        return json.nextId == null
            ? null
            : baseTocUrl + "&nextId=" + json.nextId;
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "flex");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("main img")?.src;
    }
    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("article")];
    }
}
