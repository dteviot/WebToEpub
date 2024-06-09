"use strict";

parserFactory.register("wetriedtls.com", () => new WetriedParser());

class WetriedParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let seriesId = this.findSeriesId(dom);
        return this.fetchTocPage(seriesId, 1, 2000);
    }

    findSeriesId(dom) {
        if (dom.baseURI == "https://wetriedtls.com/series/infinite-mage") {
            // Special case. Only 14 stores on the site, and only infinite mage doesn't work.
            return 11;
        }
        let prefix = "series_id\\\":";
        let script = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes(prefix))[0];
        let startIndex = script.indexOf(prefix) + prefix.length;
        let endIndex = script.indexOf(",", startIndex);
        return parseInt(script.substring(startIndex, endIndex));
    }

    async fetchTocPage(seriesId, page, perPage) {
        const query = `page=${page}&perPage=${perPage}&series_id=${seriesId}` 
        let json = (await HttpClient.fetchJson(`https://api.wetriedtls.com/chapter/query?${query}`)).json;
        return json.data.map(c => this.jsonToChapter(c))
            .reverse();
    }

    jsonToChapter(json) {
        let seriesSlug = json.series.series_slug;;
        let chapterLeaf = json.chapter_slug;
        return ({
            sourceUrl:  `https://wetriedtls.com/series/${seriesSlug}/${chapterLeaf}`,
            title: json.chapter_name + ": " + json.chapter_title,
        });;
    }

    findContent(dom) {
        return (
            dom.querySelector("#reader-container") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.space-y-3");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.space-y-3 p").parentNode];
    }
}
