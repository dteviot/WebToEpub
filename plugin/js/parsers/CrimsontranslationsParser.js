"use strict";

parserFactory.register("crimsontranslations.com", () => new CrimsontranslationsParser());

class CrimsontranslationsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ol.grid");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#root");
    }

    async fetchChapter(url) {
        let contentUrl = url.replace(".com/", ".com/api/");
        let xhr = await HttpClient.fetchJson(contentUrl);
        let doc = this.jsonToHtml(xhr.json);
        return doc;
    }
 
    jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.title;
        newDoc.content.appendChild(header);
        let paragraphs = json.content.replace(/\n\n/g, "\r\n").split("\r\n")
        for (let text of paragraphs) {
            let p = newDoc.dom.createElement("p");
            p.appendChild(newDoc.dom.createTextNode(text))
            newDoc.content.appendChild(p);
        }
        return newDoc.dom;
    }


    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.border-2.text-tertiary")];
    }
}
