"use strict";

parserFactory.register("goodnovel.com", () => new GoodnovelParser());

class GoodnovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapUrl = dom.querySelector("div.catalog a");
        let body = ({
            bookId: this.bookAndChapterFromUrl(chapUrl).bookId,
            pageNo: 1,
            pageSize: this.extractNumChapters(dom),
            rid: ""
        });
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        };
        let json = (await HttpClient.fetchJson("https://www.goodnovel.com/hwyc/chapter/list/preview", options)).json.data;
        return json.records.map(r => this.recordToChapter(r, body.bookId));
    }

    recordToChapter(record, bookId) {
        return ({
            sourceUrl:  `https://www.goodnovel.com/book-info/${bookId}-${record.id}`,
            title: record.chapterName,
        });
    }

    extractNumChapters(dom) {
        return parseInt(dom.querySelector(".catalog-count").textContent.split(" ")[0]);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".bookinfo h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookinfo");
    }

    async fetchChapter(url) {
        let json = (await this.fetchContentForChapter(url));
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(json.content, newDoc.content);
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.chapterName;
        newDoc.content.prepend(header);
        return newDoc.dom;        
    }

    async fetchContentForChapter(url) {
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(this.bookAndChapterFromUrl(url))
        };
        return (await HttpClient.fetchJson("https://www.goodnovel.com/hwyc/chapter/detail", options)).json.data;
    }

    bookAndChapterFromUrl(url) {
        let path = new URL(url).pathname.split("/").pop();
        let components = path.split("-");
        return ({bookId: components[0], chapterId: components[1]});
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#bidph")];
    }
}
