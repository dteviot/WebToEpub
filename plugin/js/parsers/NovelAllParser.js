/*
  Parser for www.novelall.com
*/
"use strict";

parserFactory.register("novelall.com", function() { return new NovelAllParser() });

class NovelAllParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "ul", e => e.className === "detail-chlist")
        let chapters = (menu === null) ? [] : this.buildChapterList(menu);
        return Promise.resolve(chapters);
    };

    buildChapterList(menu) {
        return util.getElements(menu, "a").reverse().map(
           a => ({sourceUrl: a.href, title: a.getAttribute("title")})
       );
    };
    
    findContent(dom) {
        return util.getElement(dom.body, "div", e => e.className.startsWith("reading-box"));
    };

    // title of the story
    extractTitle(dom) {
        return util.getElement(dom.body, "h1").textContent;
    };

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return util.getElement(dom.body, "h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", e => e.className.startsWith("manga-detailtop"));
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
