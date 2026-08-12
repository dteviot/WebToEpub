"use strict";

parserFactory.register("novelarchive.cc", () => new NovelArchiveParser());

class NovelArchiveParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
        this.apiBase = "https://novelarchive.cc/api";
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#novel-title");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("#novel-author");
        return author ? author.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("#novel-cover")?.src;
    }

    extractNovelId(dom) {
        let match = dom.baseURI.match(/[?&]id=([^&#]+)/);
        if (!match) {
            throw new Error("Unable to find novel id in url.");
        }
        return match[1];
    }

    async fetchApiJson(path) {
        let response = await HttpClient.fetchJson(`${this.apiBase}${path}`);
        return response.json;
    }

    async getChapterUrls(dom) {
        let novelId = this.extractNovelId(dom);
        let data = await this.fetchApiJson(`/novels/${novelId}`);
        let names = data.novel.chapter_names;
        if (!Array.isArray(names)) {
            throw new Error("Unexpected novel response for id " + novelId);
        }
        return names.map((name, index) => ({
            sourceUrl: `${this.apiBase}/novels/${novelId}/chapters/${index + 1}`,
            title: name
        }));
    }

    async fetchChapter(url) {
        let response = await HttpClient.fetchJson(url);
        let chapterData = response.json?.chapter;
        if (!chapterData?.content) {
            throw new Error("Unexpected chapter response for " + url);
        }

        let newDoc = Parser.makeEmptyDocForContent(url);
        Parser.addTextToChapterContent(newDoc, chapterData.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }
}