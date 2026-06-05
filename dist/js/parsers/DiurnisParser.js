"use strict";

parserFactory.register("diurnis.com", () => new DiurnisParser());

class DiurnisParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            this.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    getUrlsOfTocPages(dom) {
        let baseUrl = dom.baseURI;
        let max = this.extractMaxToc(dom);
        let tocUrls = [];
        for (let i = 2; i <= max; ++i) {
            tocUrls.push(`${baseUrl}?page=${i}`);
        }
        return tocUrls;
    }

    extractMaxToc(dom) {
        let buttons = [...dom.querySelectorAll("main div.justify-center button")];
        return (buttons.length < 4) 
            ? 1
            : parseInt(buttons[buttons.length-2].textContent);
    }

    extractPartialChapterList(dom) {
        let menu = dom.querySelector("table");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main picture");
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        return this.buildChapter(dom, url);
    }

    buildChapter(dom, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = dom.querySelector("h1").textContent;
        newDoc.content.appendChild(title);
        let text = dom.querySelector("p.break-words").textContent
            .replace(/\n\n/g, "\n")
            .split("\n");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".pb-4")];
    }
}
