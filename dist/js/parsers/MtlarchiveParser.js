"use strict";

parserFactory.register("fictionzone.net", () => new MtlarchiveParser());

// mtlarchive.com and reader-hub.com were previous names of site

class MtlarchiveParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom) {
        let storyId = await this.fetchStoryId(dom.baseURI);
        let json = await this.fetchChaptersJson(storyId);
        return this.jsonToChapterList(json, storyId);
    }

    toChapter(link) {
        return ({
            title: link.querySelector("span.chapter-title").textContent,
            sourceUrl: link.href
        });
    }

    async fetchStoryId(url) {
        let path = "/platform/novel-details?slug=" + this.extractSlug(url);
        let json = await this.fetchJsonFromSite(path);
        return json?.data?.id || null;
    }

    async fetchChaptersJson(storyId) {
        let path = "/platform/chapter-lists?novel_id=" + storyId;
        let json = await this.fetchJsonFromSite(path);
        return json?.data?.chapters ?? [];
    }

    jsonToChapterList(json, storyId) {
        return json.map(c => ({
            title: c.title,
            sourceUrl: `https://fictionzone.net/platform/chapter-content?novel_id=${storyId}&chapter_id=${c.chapter_id}&&highlight=true`
        }));
    }

    extractSlug(url) {
        return url.split("/").pop();
    }

    async fetchJsonFromSite(path) {
        let payload = `{"path": "${path}",` +
            "\"method\": \"get\" }";
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: payload
        };
        let json = (await HttpClient.fetchJson("https://fictionzone.net/api/__api_party/fictionzone", options)).json;
        return json;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".metadata-value");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    async fetchChapter(url) {
        let path = url.replace("https://fictionzone.net", "");
        let json = await this.fetchJsonFromSite(path);
        return this.buildChapter(json.data, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.title;
        newDoc.content.appendChild(title);
        Parser.addTextToChapterContent(newDoc, json.content);
        return newDoc.dom;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover-image-wrapper");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis-text")];
    }
}
