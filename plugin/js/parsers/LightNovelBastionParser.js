"use strict";

parserFactory.register("lightnovelbastion.com", function() { return new LightNovelBastionParser(); });

class LightNovelBastionParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.listing-chapters_wrap");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.reading-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("ol.breadcrumb li.active").textContent;
    }

    extractTitleImpl(dom) {
        let element = dom.querySelector("div.post-title");
        if (element !== null) {
            util.removeChildElementsMatchingSelector(element, "span");
            return element.textContent;
        }
        return null;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.lnbad-tag");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content p:not(.zeno_font_resizer)")];
    }
}
