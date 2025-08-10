"use strict";

parserFactory.register("chosentwofanfic.com", function() { return new ChosentwofanficParser(); });

class ChosentwofanficParser extends Parser {
    constructor() {
        super();
        this.ChacheChapterTitle = new Map();
    }

    async getChapterUrls(dom) {
        let urlparams = new URL(dom.baseURI).searchParams;
        let bookid = urlparams.get("sid");
        let tocHtml = (await HttpClient.wrapFetch("https://chosentwofanfic.com/viewstory.php?sid="+bookid+"&index=1")).responseXML;
        let chapters = [...tocHtml.querySelectorAll("#output a")].filter(a => a.href.includes("viewstory.php?sid="+bookid+"&"));
        let ret = chapters.map(a => ({
            sourceUrl: a.href, 
            title: a.textContent
        }));
        return ret;
    }
    
    async loadEpubMetaInfo(dom) {
        let urlparams = new URL(dom.baseURI).searchParams;
        let bookid = urlparams.get("sid");
        let bookinfo = (await HttpClient.wrapFetch("https://chosentwofanfic.com/viewstory.php?sid="+bookid+"&index=1")).responseXML;
        let pagetitle = [...bookinfo.querySelectorAll("#pagetitle a")].filter(a => a.textContent != "");
        this.title = pagetitle[0].textContent;
        this.author = pagetitle[1].textContent;
        this.description = bookinfo.querySelectorAll("#output .content p")[0].textContent;
        this.img = dom.querySelector("#pagetitle img")?.src ?? null;
        return;
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.img;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#output div.content")];
    }

    findContent(dom) {
        return dom.querySelector("#story");
    }

    findChapterTitle(dom) {
        let tmptitle = this.ChacheChapterTitle.get(dom.baseURI);
        return tmptitle;
    }

    preprocessRawDom() {
        if (this.ChacheChapterTitle.size == 0) {
            let pagesToFetch = [...this.state.webPages.values()].filter(c => c.isIncludeable);
            pagesToFetch.map(a => (this.ChacheChapterTitle.set(a.sourceUrl, a.title)));
        }
    }
}