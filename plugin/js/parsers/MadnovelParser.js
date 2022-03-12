"use strict";

parserFactory.register("madnovel.com", () => new MadnovelParser());


class MadnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".chapter-list");
        util.hyperLinkToChapter = function (link, newArc) {
            return {
                sourceUrl: link.href,
                title: link.querySelector("strong").innerText,
                newArc: (newArc === undefined) ? null : newArc
            };
        }
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector(".content-inner");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = [...dom.querySelectorAll("a[href*='authors'] span")].map(x => x.textContent.trim())
        return (authorLabel.length === 0) ? super.extractAuthor(dom) : authorLabel.join(", ");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("a[href*='genres'] span")]
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".ads-banner, .content-inner > br");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".img-cover");
    }

}
