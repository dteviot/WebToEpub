"use strict";

parserFactory.register("inkitt.com", () => new InkittParser());

class InkittParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapters-list a")]
            .map(this.linkToChapter);
    }

    linkToChapter(link) {
        let title = link.querySelector("span.chapter-nr.chapter-nr").textContent
            + " " + link.querySelector(".chapter-title").textContent;
        return {
            sourceUrl:  link.href,
            title: title
        };
    }

    findContent(dom) {
        return dom.querySelector("#story-text-container");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story-title");
    }

    extractAuthor(dom) {
        return dom.querySelector("span[id='storyAuthor']")?.textContent ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.story-horizontal-cover__front");
        return util.extractUrlFromBackgroundImage(div);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.story-summary")];
    }
}
