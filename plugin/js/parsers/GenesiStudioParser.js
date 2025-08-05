/*
  Parses files on https://genesistudio.com
*/
"use strict";

parserFactory.register("genesistudio.com", () => new GenesiStudioParser());

class GenesiStudioParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
    }
    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false; 
    }

    async getChapterUrls(dom) {
        let data = (await HttpClient.fetchJson(dom.baseURI + "/__data.json")).json;
        let tmpids = data.nodes[2].data[0].chapters;
        let freeids = data.nodes[2].data[data.nodes[2].data[tmpids].free];
        let paidids = data.nodes[2].data[data.nodes[2].data[tmpids].premium];

        let chapters = freeids.map(a => ({
            sourceUrl:  "https://genesistudio.com/viewer/"+data.nodes[2].data[data.nodes[2].data[a].id],
            title: document.getElementById("removeChapterNumberCheckbox").checked ? data.nodes[2].data[data.nodes[2].data[a].chapter_title]: "Chapter " + data.nodes[2].data[data.nodes[2].data[a].chapter_number]+ ": " + data.nodes[2].data[data.nodes[2].data[a].chapter_title],
            isIncludeable: true    
        }));

        let pchapters = paidids.map(a => ({
            sourceUrl:  "https://genesistudio.com/viewer/"+data.nodes[2].data[data.nodes[2].data[a].id],
            title: document.getElementById("removeChapterNumberCheckbox").checked ? data.nodes[2].data[data.nodes[2].data[a].chapter_title]: "Chapter " + data.nodes[2].data[data.nodes[2].data[a].chapter_number]+ ": " + data.nodes[2].data[data.nodes[2].data[a].chapter_title],
            isIncludeable: false    
        }));

        return chapters.concat(pchapters);
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let data = (await HttpClient.fetchJson(dom.baseURI + "/__data.json")).json;
        let tmpids = data.nodes[2].data[data.nodes[2].data[0].novel];
        this.title = data.nodes[2].data[tmpids.novel_title];
        this.author = data.nodes[2].data[tmpids.author];
        let genre = data.nodes[2].data[tmpids.genres];
        genre = genre.map(a => data.nodes[2].data[a]);
        this.tags = genre;
        this.description = data.nodes[2].data[tmpids.synopsis];
        this.img = data.nodes[2].data[tmpids.cover];
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

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        return url + "/__data.json";
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let index = json.nodes[2].data[0].content;
        let content = util.sanitize(json.nodes[2].data[index]);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
    
    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }
}
