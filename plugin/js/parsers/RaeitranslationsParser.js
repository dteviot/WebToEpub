"use strict";

parserFactory.register("raeitranslations.com", () => new RaeitranslationsParser());

class RaeitranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.chapter-list a")]
            .map(this.linkToChapter);
    }

    linkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link.querySelector(".chapter-title").innerText.trim(),
        };
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.title");
    }

    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.img.wrapper [style*=background-image]");
        return "https://raeitranslations.com" + util.extractUrlFromBackgroundImage(div);
    }

    async fetchChapter(url) {
        let restUrl = this.makeRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        let content = this.buildHtml(json.currentChapter);
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.appendChild(content);
        return newDoc.dom; 
    }

    makeRestUrl(chapterUrl) {
        let path = new URL(chapterUrl).pathname.split("/");
        let restUrl = new URL("https://api.raeitranslations.com/api/chapters/single");
        restUrl.searchParams.set("id", path[1]);
        restUrl.searchParams.set("num", path[2]);
        return restUrl;
    }

    buildHtml(json) {
        let paragraphs = json.body.replace(/\n/g, "</p><p>");
        let html = `<div><h1>${json.chapTitle}</h1><p>${paragraphs}</p></div>`;
        let doc = util.sanitize(html, "text/html");
        return doc.querySelector("div");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.white-space")];
    }
}
