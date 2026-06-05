"use strict";

parserFactory.register("ruvers.ru", () => new RuversParser());

class RuversParser extends Parser {
    constructor() {
        super();
        this.ChacheChapterTitle = new Map();
    }

    async getChapterUrls(dom) {
        let tocHtml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        let idcontainer = tocHtml.querySelector("books-chapters-list");
        // eslint-disable-next-line
        let regex = new RegExp("book-id=\"[0-9]+\"");
        let id = idcontainer.outerHTML.match(regex)?.[0].slice(9,-1);
        let bookinfo = (await HttpClient.fetchJson("https://ruvers.ru/api/books/"+id+"/chapters/all")).json;
        return bookinfo.data.map(a => ({
            sourceUrl: "https://ruvers.ru/"+a.book_slug+"/"+a.id, 
            title: a.full_name,
            isIncludeable: a.is_free==true
        }));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".book_inner img")?.src ?? null;
    }

    extractDescription(dom) {
        return dom.querySelector("div.book_description").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book_inner, div.book_description, div.book_information")];
    }

    fixUnicodeString(wronglyEscaped) {
        return wronglyEscaped.replace(/\\u([\da-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    }
    
    async fetchChapter(url) {
        if (this.ChacheChapterTitle.size == 0) {
            let pagesToFetch = [...this.state.webPages.values()].filter(c => c.isIncludeable);
            pagesToFetch.map(a => (this.ChacheChapterTitle.set(a.sourceUrl, a.title)));
        }
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let textcontainer = dom.querySelector("books-chapters-text-component");
        // eslint-disable-next-line
        let regex = new RegExp("text=\".*?\"");
        let text = textcontainer.outerHTML.match(regex)?.[0].slice(12,-7);
        text = text.replaceAll("\\/", "/");
        text = this.fixUnicodeString(text);
        return this.buildChapter(text, url);
    }

    buildChapter(chapcontent, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = this.ChacheChapterTitle.get(url);
        newDoc.content.appendChild(title);
        let content = util.sanitize(chapcontent);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
