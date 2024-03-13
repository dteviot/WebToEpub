"use strict";

parserFactory.register("wetriedtls.site", function () {return new WetriedParser();});

class WetriedParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let seriesId = this.findSeriesId(dom);
        return this.fetchTocPage(seriesId, 1, 2000);
    }

    findSeriesId(dom) {
        let prefix = "series_id\\\":";
        let script = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes(prefix))[0];
        let startIndex = script.indexOf(prefix) + prefix.length;
        let endIndex = script.indexOf(",", startIndex);
        return parseInt(script.substring(startIndex, endIndex));
    }

    async fetchTocPage(seriesId, page, perPage) {
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: `{"series_id":${seriesId},"page":${page},"perPage":${perPage}}`
        };
        let json = (await HttpClient.fetchJson("https://api.wetriedtls.site/chapter/query", options)).json;
        return json.data.map(c => this.jsonToChapter(c))
            .reverse();
    }

    jsonToChapter(json) {
        let seriesSlug = json.series.series_slug;;
        let chapterLeaf = json.chapter_slug;
        return ({
            sourceUrl:  `https://wetriedtls.site/series/${seriesSlug}/${chapterLeaf}`,
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
