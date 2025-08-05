"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).startsWith("booktoki")),
    () => new Booktoki152Parser()
);

class Booktoki152Parser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1500;
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.list-body a")]
            .map(this.linkToChapter)
            .reverse();
    }

    linkToChapter(link) {
        util.removeChildElementsMatchingSelector(link, "span");
        return ({
            sourceUrl:  link.href,
            title: link.textContent.trim()
        });
    }

    findContent(dom) {
        return dom.querySelector("#novel_content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.view-content span b");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.toon-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.view-title");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.view-content div.view-content")];
        return (nodes.length === 3)
            ? [nodes[1]]
            : [];
    }
}
