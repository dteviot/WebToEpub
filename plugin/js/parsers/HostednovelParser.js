"use strict";

parserFactory.register("hostednovel.com", () => new HostednovelParser());

class HostednovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let url = new URL(dom.baseURI);
        url.hash = "";
        if (!url.pathname.endsWith("/chapters")) {
            url.pathname += "/chapters";
        }
        let urlsOfTocPages = this.extractTocPageUrls(dom, url.toString());
        let chapters = [];
        return (await Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI))
            .concat(this.chapterUrlsOnPage(dom));
    }

    extractTocPageUrls(dom, initialTocUrl) {
        return [...dom.querySelectorAll(".chaptergroup")]
            .map(s => initialTocUrl + "/" + s.getAttribute("data-id"));
    }

    extractPartialChapterList(dom) {
        return util.hyperlinksToChapterList(dom);
    }

    chapterUrlsOnPage(dom) {
        return [...dom.querySelectorAll(".chaptergroup a:not([rel])")]
            .map(a => util.hyperLinkToChapter(a))
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

    findCoverImageUrl(dom) {
        return dom.querySelector("img.cover-image")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [this.getInfoCard(dom)]
            .filter(c => c != null);
    }

    getInfoCard(dom) {
        let cards = [...dom.querySelectorAll("div.card-body")]
        return 1 < cards.length ? cards[1] : null;
    }
}
