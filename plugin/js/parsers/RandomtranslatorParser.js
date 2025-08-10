"use strict";

parserFactory.register("randomtranslator.com", () => new RandomtranslatorParser());

class RandomtranslatorParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/novel\/.+");
        let bookhash = dom.baseURI.match(regex)?.[0].slice(7);
        let bookinfo = (await HttpClient.fetchJson("https://api.randomtranslator.com/api/v1/novels/" + bookhash)).json;
        let chapterssorted = [...bookinfo.chapters].sort((a,b) => a.sequence_number - b.sequence_number);
        let chapters = chapterssorted.map(a => ({
            sourceUrl:  "https://www.randomtranslator.com/chapter/"+a.id,
            title: a.translated_title,
            isIncludeable: !a.is_restricted    
        }));
        return chapters;
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/novel\/.+");
        let bookhash = dom.baseURI.match(regex)?.[0].slice(7);
        let bookinfo = (await HttpClient.fetchJson("https://api.randomtranslator.com/api/v1/novels/" + bookhash)).json;
        this.title = bookinfo.translated_title;
        this.author = bookinfo.translated_author;
        this.tags = bookinfo.tags.map(a => a.translated_name);
        this.tags = this.tags.concat(bookinfo.translated_category);
        this.description = bookinfo.ai_description;
        this.img = bookinfo.image_url;
        return;
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractSubject() {
        let tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.img;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/");
        let id = leaves[leaves.length - 1];
        return "https://api.randomtranslator.com/api/v1/chapters/" + id;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.translated_title;
        newDoc.content.appendChild(title);
        let text = json.translated_content.replace("\n\n", "\n");
        text = text.split("\n");
        let br = newDoc.dom.createElement("br");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
