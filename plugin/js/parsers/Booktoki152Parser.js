"use strict";

parserFactory.register("booktoki152.com", () => new Booktoki152Parser());
parserFactory.register("booktoki156.com", () => new Booktoki152Parser());

class Booktoki152Parser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul.list-body a")]
            .map(this.linkToChapter)
            .reverse();
    }

    linkToChapter(link) {
        util.removeChildElementsMatchingCss(link, "span");
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
