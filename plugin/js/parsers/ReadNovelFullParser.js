"use strict";

parserFactory.register("readnovelfull.com", () => new ReadNovelFullParser());

class ReadNovelFullParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = ReadNovelFullParser.extractChapterList(dom);
        if (0 < chapters.length) {
            return Promise.resolve(chapters);
        }
        return await ReadNovelFullParser.fetchChapterList(dom);
    }

    static async fetchChapterList(dom) {
        let novelId = dom.querySelector("div#rating").getAttribute("data-novel-id");
        let url = `https://readnovelfull.com/ajax/chapter-archive?novelId=${novelId}`;
        let xhr = await HttpClient.wrapFetch(url);
        return ReadNovelFullParser.extractChapterList(xhr.responseXML);
    }

    static extractChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#chr-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("ul.info li:nth-of-type(2) a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("a.chr-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text")];
    }

}
