"use strict";

parserFactory.register("fimfiction.net", () => new FimfictionParser());

class FimfictionParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.chapters a.chapter-title")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#chapter");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("a.story_name").textContent;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.info-container a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "h1.chapter-title div[style='float:right']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.story_container__story_image");
    }

    getInformationEpubItemChildNodes(dom) {
        let likes = dom.querySelector("span.likes");
        likes.textContent = "Likes: " + likes.textContent;
        return [...dom.querySelectorAll("span.description-text, "
            + "div.chapters-footer div.word_count")].concat(likes);
    }
}
