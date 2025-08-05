"use strict";

parserFactory.register("crimsontranslations.com", () => new CrimsontranslationsParser());

class CrimsontranslationsParser extends Parser {
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
        let doc = this.jsonToHtml(xhr.json.chapterContent);
        return doc;
    }
 
    jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.title;
        newDoc.content.appendChild(header);
        this.insertParagraphs(json.content, newDoc.content, newDoc.dom);
        this.addSection(json.footnote, newDoc.content, newDoc.dom, "Footnote:");
        this.addSection(json.chapter_author_note, newDoc.content, newDoc.dom, "Author Note:");
        this.addSection(json.chapter_tl_note, newDoc.content, newDoc.dom, "TL Note:");
        return newDoc.dom;
    }

    addSection(paragraphs, content, dom, title) {
        if (paragraphs != null) {
            let header = dom.createElement("h2");
            header.textContent = title;
            content.appendChild(header);
            this.insertParagraphs(paragraphs, content, dom);
        }
    }

    insertParagraphs(paragraphs, content, dom) {
        for (let text of paragraphs.replace(/\n\n/g, "\r\n").split("\r\n")) {
            let p = dom.createElement("p");
            p.appendChild(dom.createTextNode(text));
            content.appendChild(p);
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.border-2.text-tertiary")];
    }
}
