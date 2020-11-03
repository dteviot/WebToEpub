"use strict";

parserFactory.register("nightcomic.com", function() { return new NightcomicParser() });
parserFactory.register("webnovel.live", function() { return new NightcomicParser() });
parserFactory.register("noveltrench.com", function() { return new NightcomicParser() });
parserFactory.register("mangasushi.net", function() { return new NightcomicParser() });
parserFactory.register("mangabob.com", function() { return new NightcomicParser() });

class NightcomicParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
    };

    findContent(dom) {
        let content = dom.querySelector("div.reading-content");
        for(let i of content.querySelectorAll("img")) {
            let data_src = i.getAttribute("data-src");
            if (!util.isNullOrEmpty(data_src) && util.isNullOrEmpty(i.src)) {
                i.src = data_src;
            }
        }
        return content;
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
