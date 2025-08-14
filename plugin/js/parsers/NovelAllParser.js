/*
  Parser for www.novelall.com
*/
"use strict";

parserFactory.register("novelall.com", () => new NovelAllParser());

class NovelAllParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menuItems = [...dom.querySelectorAll("ul.detail-chlist a")];
        return Promise.resolve(this.buildChapterList(menuItems));
    }

    buildChapterList(menuItems) {
        return menuItems.reverse().map(
            a => ({sourceUrl: a.href, title: a.getAttribute("title")})
        );
    }
    
    findContent(dom) {
        return dom.querySelector("div.reading-box");
    }

    extractAuthor(dom) {
        let link = dom.querySelector("a[href*='author']");
        return (link == null) ? super.extractAuthor(dom) : link.textContent;
    }

    // title of the story
    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.manga-detailtop");
    }

    getInformationEpubItemChildNodes(dom) {
        return  [...dom.querySelectorAll("div.manga-detailtop, div.manga-detailmiddle")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script");
    }
}
