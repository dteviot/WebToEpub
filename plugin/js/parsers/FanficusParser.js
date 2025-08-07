"use strict";

parserFactory.register("fanficus.com", () => new FanficusParser());

class FanficusParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".ff-chapters-body");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let path = new URL(url).pathname;
        let contentUrl = "https://fanficus-server-mirror-879c30cd977f.herokuapp.com/api/v1" + path;
        let xhr = await HttpClient.fetchJson(contentUrl);
        let doc = this.jsonToHtml(xhr.json);
        return doc;
    }
 
    jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.value.title;
        newDoc.content.appendChild(header);
        let doc = util.sanitize("<div id='start'>" + json.value.text + "</div>");
        newDoc.content.appendChild(doc.querySelector("div#start"));
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("app-post-main-info")];
    }
}
