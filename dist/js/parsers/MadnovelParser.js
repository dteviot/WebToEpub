"use strict";

parserFactory.register("madnovel.com", () => new MadnovelParser());
parserFactory.register("novelbuddy.com", () => new MadnovelParser());
parserFactory.register("novelbuddy.io", () => new MadnovelParser());

class MadnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".chapter-list");
        if (menu == null) { return []; }

        let linkSet = new Set();
        let includeLink = function(link) {
            if (util.isNullOrEmpty(link.innerText) || util.isNullOrEmpty(link.href)) {
                return false;
            }
            let href = util.normalizeUrlForCompare(link.href);
            if (linkSet.has(href)) {
                return false;
            }
            linkSet.add(href);
            return true;
        };

        return util.getElements(menu, "a", a => includeLink(a))
            .map(link => ({
                sourceUrl: link.href,
                title: link.querySelector("strong").innerText,
                newArc: null
            }))
            .reverse();
    }

    findContent(dom) {
        return dom.querySelector(".content-inner");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = [...dom.querySelectorAll("a[href*='authors'] span")].map(x => x.textContent.trim());
        return (authorLabel.length === 0) ? super.extractAuthor(dom) : authorLabel.join(", ");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("a[href*='genres']")];
        return tags.map(e => e.textContent.trim()).join("");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".ads-banner, .content-inner > br");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter__content h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".img-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".section-body.summary")];
    }
}
