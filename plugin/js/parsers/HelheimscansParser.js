"use strict";

//dead urls
parserFactory.register("helheimscans.com", () => new HelheimscansParser());
parserFactory.register("helheimscans.org", () => new HelheimscansParser());
//Helheim Scans moved to Helio Scans
parserFactory.register("helioscans.com", () => new HelheimscansParser());


class HelheimscansParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("#chapters_panel a")]
            .map(this.linkToChapter)
            .reverse();
    }

    linkToChapter(link) {
        let title = link.querySelector("span").textContent.trim();
        return ({
            sourceUrl:  link.href,
            title: title
        });
    }

    findContent(dom) {
        return dom.querySelector("#pages div.novel-reader");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("title");
    }

    findCoverImageUrl(dom) {
        let url = dom.querySelector("div[style^=--photo]");
        url = url.getAttribute("style").split("(")[1];
        return url
            ? url.substring(0, url.length - 1)
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#expand_content")];
    }
}
