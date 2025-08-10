"use strict";

//dead url/ parser
parserFactory.register("wnmtl.org", () => new WnmtlOrgParser());

class WnmtlOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let bookId = this.idFromUrl(dom.baseURI);
        let tocUrl = this.makeTocUrl(bookId, 1);
        let data = (await HttpClient.fetchJson(tocUrl)).json.data;
        let chapters = this.extractPartialChapterListFromJson(data);
        for (let url of this.makeUrlsOfTocPages(bookId, data.totalPages)) {
            data = (await HttpClient.fetchJson(url)).json.data;
            let partialList = this.extractPartialChapterListFromJson(data);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    idFromUrl(url) {
        return new URL(url).pathname.split("/").pop().split("-")[0];
    }

    makeTocUrl(bookId, page) {
        return "https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/page?sortDirection=ASC" +
            `&bookId=${bookId}&pageNumber=${page}&pageSize=100`;
    }

    makeUrlsOfTocPages(bookId, totalPages) {
        let urls = [];
        for (let page = 2; page <= totalPages; ++page) {
            urls.push(this.makeTocUrl(bookId, page));
        }
        return urls;
    }

    extractPartialChapterListFromJson(data) {
        return data.list.map(e => ({
            sourceUrl:  `https://wnmtl.org/chapter/${e.id}-dummy`,
            title: `${e.chapterOrder}. ${e.title}`
        }));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-name");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-name");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    async fetchChapter(url) {
        let restUrl = this.calcRestUrlForContent(url);
        let data = (await HttpClient.fetchJson(restUrl)).json.data;
        return WnmtlOrgParser.buildChapter(data, url);
    }

    calcRestUrlForContent(url) {
        // assumes chapter URL like https://wnmtl.org/chapter/148888-untitled
        // and REST URL like https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/148888
        let id = this.idFromUrl(url);
        return `https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/${id}`;
    }

    static buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = `${json.chapterOrder}. ${json.title}`;
        newDoc.content.appendChild(title);
        let paragraphs = json.content.split("\n")
            .filter(p => !util.isNullOrEmpty(p));
        for (let text of paragraphs) {
            let p = newDoc.dom.createElement("p");
            p.appendChild(newDoc.dom.createTextNode(text));
            newDoc.content.appendChild(p);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#about-panel")];
    }
}
