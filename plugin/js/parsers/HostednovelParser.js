"use strict";

parserFactory.register("hostednovel.com", () => new HostednovelParser());

class HostednovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterList = dom.querySelector("div.chaptergroup");
        return util.hyperlinksToChapterList(chapterList);
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
