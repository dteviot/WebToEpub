"use strict";

parserFactory.register("app.yoru.world", () => new AppYoruWorldParser());

class AppYoruWorldParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/story\/[0-9]+");
        let bookid = dom.baseURI.match(regex)?.[0].slice(7);
        let data = (await HttpClient.fetchJson("https://pxp-main-531j.onrender.com/api/v1/books/" + bookid)).json;
        let notInclude = data.paywall.first_n_chapters;
        let ChapterArray = data.chapters;
        let ChapterArrayFree = ChapterArray.map(a => ({
            sourceUrl: "https://app.yoru.world/en/story/"+bookid+"/read/" + a.id, 
            title: a.title,
            isIncludeable: (a.number <= notInclude || notInclude == null)
        }));
        return ChapterArrayFree.reverse();
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/story\/[0-9]+");
        let bookid = dom.baseURI.match(regex)?.[0].slice(7);
        let bookinfo = (await HttpClient.fetchJson("https://pxp-main-531j.onrender.com/api/v1/books/" + bookid)).json;
        this.title = bookinfo.title;
        this.author = bookinfo.author.display_name;
        this.tags = bookinfo.tags.map(a => a.name);
        this.description = bookinfo.summary;
        this.img = (await HttpClient.fetchJson("https://pxp-main-531j.onrender.com/api/v1/aws/s3/"+bookinfo.cover.id+":sign_get")).json;
        return;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
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
        let documenturl = (await HttpClient.fetchJson(restUrl)).json;
        let rawHTML = (await HttpClient.fetchHtml(documenturl)).responseXML;
        return this.buildChapter(rawHTML, url);
    }

    toRestUrl(url) {
        let regex = new RegExp("[0-9]+$");
        let id = url.match(regex)[0];
        return "https://pxp-main-531j.onrender.com/api/v1/book_chapters/"+id+"/content";
    }

    buildChapter(rawHTML, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.appendChild(rawHTML.body);
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#about-panel.synopsis")];
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
}
