"use strict";

parserFactory.register("botitranslation.com", () => new BotitranslationParser());
parserFactory.register("mystorywave.com", () => new BotitranslationParser());

class BotitranslationParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/book\/[0-9]+");
        let bookid = dom.baseURI.match(regex)?.[0].slice(6);
        let data = (await HttpClient.fetchJson("https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/page?sortDirection=ASC&bookId=" + bookid + "&pageNumber=1&pageSize=100")).json;
        let totalCount = data.data.totalCount;
        if (totalCount > 100) {
            data = (await HttpClient.fetchJson("https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/page?sortDirection=ASC&bookId=" + bookid + "&pageNumber=1&pageSize=" + totalCount)).json;
        }
        let ChapterArray = data.data.list;
        let ChapterArrayFree = ChapterArray.map(a => ({
            sourceUrl: "https://www.botitranslation.com/chapter/" + a.id, 
            title: a.title, 
            isIncludeable: (a.paywallStatus == "free" && a.tier == 0)
        }));
        return ChapterArrayFree;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-name");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-name");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover-container");
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/");
        let id = leaves[leaves.length - 1].split("-")[0];
        return "https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/" + id;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.data.title;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json.data.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#about-panel.synopsis")];
    }
}
