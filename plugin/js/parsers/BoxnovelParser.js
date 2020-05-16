"use strict";

parserFactory.register("boxnovel.com", function() { return new BoxnovelParser() });

class BoxnovelParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a")]
            .map(link => util.hyperLinkToChapter(link))
            .reverse();
    };

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    };

    extractTitleImpl(dom) {
        let title = dom.querySelector("div.post-title h3");
        for(let e of [...title.querySelectorAll("span.manga-title-badges")]) {
            e.remove();
        }
        return title;
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector("ol.breadcrumb li.active").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.post-content, div.description-summary")];
    }
}
