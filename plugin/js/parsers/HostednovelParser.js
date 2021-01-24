"use strict";

parserFactory.register("hostednovel.com", () => new HostednovelParser());

class HostednovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let url = dom.baseURI;
        if (util.extractFilenameFromUrl(url) !== "chapters") {
            url += "/chapters";
            dom = (await HttpClient.wrapFetch(url)).responseXML;
        }
        let urlsOfTocPages = this.extractTocPageUrls(dom, url);
        let chapters = [];
        return Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI);
    }

    extractTocPageUrls(dom, initialTocUrl) {
        return [...dom.querySelectorAll("article.card.chaptergroup")]
            .map(article => article.className.split(" ").filter(s => s.startsWith("chaptergroup-")))
            .map(s => s[0].split("-")[1])
            .filter(s => s != "")
            .map(s => initialTocUrl + "/" + s);
    }

    extractPartialChapterList(dom) {
        let article = dom.querySelector("article.chaptergroup");
        return util.hyperlinksToChapterList(article);
    }

    findContent(dom) {
        return dom.querySelector("#chapter");
    }

    extractTitleImpl(dom) {
        let link = dom.querySelector("h1");
        util.removeChildElementsMatchingCss(link, "a");
        return link;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.card")]
            .filter(c => c != null);
    }
}
