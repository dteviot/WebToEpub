"use strict";

parserFactory.register("inoveltranslation.com", () => new InoveltranslationParser());

class InoveltranslationParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let novelId = dom.baseURI.split("/").pop();
        let tocUrl = `https://api.inoveltranslation.com/novels/${novelId}/feed?limit=100000`;
        return (await HttpClient.fetchJson(tocUrl)).json.chapters
            .map(c => this.jsonChapterToChapter(c))
            .reverse();
    }

    jsonChapterToChapter(jsonChapter) {
        // return wrong hostname, to avoid additional parserFactory registration issues
        // fixup in fetchChapter()
        return ({
            title: this.titleFromJson(jsonChapter),
            sourceUrl: `https://inoveltranslation.com/chapters/${jsonChapter.id}`
        });
    }

    titleFromJson(jsonChapter) {
        let title = "";
        title += util.isNullOrEmpty(jsonChapter.volume)
            ? ""
            : `Vol. ${jsonChapter.volume} - `;
        title += util.isNullOrEmpty(jsonChapter.chapter)
            ? ""
            : `Ch. ${jsonChapter.chapter} - `;
        title += util.isNullOrEmpty(jsonChapter.title)
            ? ""
            : jsonChapter.title;
        return title;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }

    async fetchChapter(url) {
        let apiUrl = url.replace("inoveltranslation.com", "api.inoveltranslation.com");
        let json = (await HttpClient.fetchJson(apiUrl)).json;
        let newDoc = Parser.makeEmptyDocForContent(url);

        this.appendElement(newDoc, "h1", this.titleFromJson(json));
        this.appendParagraphs(newDoc, json.content);

        let notes = (await this.fetchNotes(url));
        if (notes !== null) {
            this.appendElement(newDoc, "h3", "Notes");
            this.appendParagraphs(newDoc, notes);
        }
        return newDoc.dom; 
    }

    appendParagraphs(newDoc, content) {
        let paragraphs = content.split("\n\n");
        for(let text of paragraphs) {
            this.appendElement(newDoc, "p", text);
        }
    }

    appendElement(newDoc, tag, text) {
        let element = newDoc.dom.createElement(tag);
        element.textContent = text;
        newDoc.content.appendChild(element);
    }

    async fetchNotes(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let script = dom.querySelector("script#__NEXT_DATA__");
        if (script === null) {
            return null;
        }
        let json = JSON.parse(script.innerHTML);
        return json?.props?.pageProps?.chapter?.notes ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("p.chakra-text")];
    }
}
