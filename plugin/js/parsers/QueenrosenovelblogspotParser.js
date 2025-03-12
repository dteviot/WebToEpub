"use strict";

parserFactory.register("queenrosenovel.blogspot.com", () => new QueenrosenovelblogspotParser());

class QueenrosenovelblogspotParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.epcheck li a")]
            .map(this.linkToChapter)
            .reverse()
    }

    linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector(".chapternum").textContent
        });
    }

    findContent(dom) {
        return dom.querySelector("div.Novel");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("header h1");
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("h1");
        util.removeChildElementsMatchingCss(title, "script");
        return title;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let script = content.querySelector("script").textContent;
        let html = script.substring(script.indexOf("`") + 1, script.length - 1);
        let doc = new DOMParser().parseFromString("<div id='start'>" + html + "</div>", "text/html");
        content.appendChild(doc.querySelector("div#start"));
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#synopsis")];
    }
}
