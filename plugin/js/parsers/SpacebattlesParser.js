"use strict";

parserFactory.register("forums.spacebattles.com", () => new SpacebattlesParser());
parserFactory.register("forums.sufficientvelocity.com", () => new SpacebattlesParser());

// Often multiple chapters per web page, so minimize calls
class FetchCache {
    constructor() {
        this.path = null;
        this.dom = null;
    }

    async fetch(url) {
        if  (!this.inCache(url)) {
            this.dom = (await HttpClient.wrapFetch(url)).responseXML;
            this.path = new URL(url).pathname;
        }
        return this.dom;
    }

    inCache(url) {
        return (((new URL(url).pathname) === this.path) 
        && (this.dom !== null));
    }
}

class SpacebattlesParser extends Parser{
    constructor() {
        super();
        this.cache = new FetchCache();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.structItem--threadmark a")]
            .filter(a => !a.querySelector("date"));
        return chapters.map(a => util.hyperLinkToChapter(a));
    };

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h1.p-title-value");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.username");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.bbCodeSpoiler");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        var fetchedDom = await this.cache.fetch(url);
        let newDoc = Parser.makeEmptyDocForContent();
        var id = (new URL(url)).hash.substring(1);
        var parent = fetchedDom.getElementById(id).parentElement;
        this.addTitleToChapter(newDoc, parent);
        var content = parent.querySelector("article.message-body");
        newDoc.content.appendChild(content);
        return newDoc.dom;
    }

    addTitleToChapter(newDoc, parent) {
        let titleElement = parent.querySelector("span.threadmarkLabel");
        let title = newDoc.dom.createElement("h1");
        title.textContent = titleElement.textContent.trim();
        newDoc.content.appendChild(title);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article.threadmarkListingHeader-extraInfoChild")];
    }
}
