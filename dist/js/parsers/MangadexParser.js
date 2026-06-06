"use strict";

parserFactory.register("mangadex.org", () => new MangadexParser());
parserFactory.register("api.mangadex.org", () => new MangadexParser());

class MangadexParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let mangaId = new URL(dom.baseURI).pathname.split("/")[2];
        let feedUrl = new URL(`https://api.mangadex.org/manga/${mangaId}/feed`);
        feedUrl.searchParams.set("translatedLanguage[]", "en");
        let json = (await HttpClient.fetchJson(feedUrl.href)).json;
        return json.data.map(this.buildChapterInfo);
    }

    buildChapterInfo(json) {
        let title = "";
        let attributes = json.attributes;
        if (attributes.volume) {
            title = "Volume: " + attributes.volume + " ";
        }
        if (attributes.chapter) {
            title += "Chapter: " + attributes.chapter + " ";
        }
        if (attributes.title) {
            title += attributes.title;
        }
        return ({
            title: title.trim(),
            sourceUrl: `https://api.mangadex.org/at-home/server/${json.id}`
        });
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".title p");
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "[style='grid-area: art;']");
    }
    
    async fetchChapter(url) {
        let options = { };
        let json = (await HttpClient.fetchJson(url, options)).json;
        return MangadexParser.jsonToHtmlWithImgTags(url, json);
    }

    static jsonToHtmlWithImgTags(pageUrl, json) {
        let newDoc = Parser.makeEmptyDocForContent(pageUrl);
        let baseUrl = json.baseUrl + "/data/" + json.chapter.hash + "/";
        for (let data of json.chapter.data) {
            let img = newDoc.dom.createElement("img");
            img.src = baseUrl + data;
            newDoc.content.appendChild(img);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.md-md-container")]
            .filter(row => (row.querySelector("img, button") === null));
    }
}
