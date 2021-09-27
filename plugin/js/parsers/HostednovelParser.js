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
        }
        let urlsOfTocPages = this.extractTocPageUrls(dom, url);
        let chapters = [];
        return Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI);
    }

    extractTocPageUrls(dom, initialTocUrl) {
        return [...dom.querySelectorAll(".chaptergroup")]
            .map(s => initialTocUrl + "/" + s.getAttribute("data-id"));
    }

    extractPartialChapterList(dom) {
        return util.hyperlinksToChapterList(dom);
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
        let card = this.getInfoCard(dom);
        return card === null ? null : card.querySelector("img").src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [this.getInfoCard(dom)]
            .filter(c => c != null);
    }

    getInfoCard(dom) {
        let cards = [...dom.querySelectorAll("div.card-body")]
        return 1 < cards.length ? cards[1] : [];
    }
}
