"use strict";

parserFactory.register("nightcomic.com", function() { return new NightcomicParser() });

class NightcomicParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
    };

    findContent(dom) {
        return dom.querySelector("div.reading-content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-title h1");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content")];
    }
}
