"use strict";

parserFactory.register("novelmedium.com", () => new NovelmediumParser());

class NovelmediumParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let url = dom.baseURI;
        if (url.includes("#")) {
            url = url.substring(0, url.indexOf("#"));
        }
        let storyId = this.getStoryId(dom, url);
        return this.fetchToc(storyId, url);
    }

    getStoryId(dom, url)  {
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.innerText.includes("__NUXT__"))[0];
        let blobs = script.innerText.split("{id:");
        let leaf = url.substring(url.lastIndexOf("/") + 1);
        let blob = blobs.filter(b => b.includes(leaf))[0];
        return blob.split(",")[0];
    }

    async fetchToc(storyId, baseUrl) {
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },            
            credentials: "include",
            body: this.createPayload(storyId)
        };
        let json = (await HttpClient.fetchJson("https://novelmedium.com/api/__api_party/novelmedium-api", options)).json;
        return json._data.map(j => this.jsonToChapter(j, baseUrl));
    }

    createPayload(storyId) {
        let payload = {
            path: "frontend/allchapters/" + storyId,
            headers: { }
        };
        return JSON.stringify(payload);
    }

    jsonToChapter(json, baseUrl) {
        return ({
            sourceUrl:  baseUrl + "/" + json.slug,
            title: json.title
        });
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-container .content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-container .heading h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".summary")];
    }
}
