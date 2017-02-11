/*
  Parser for http://novelonlinefree.com/
*/
"use strict";

parserFactory.register("novelonlinefree.com", function() { return new NovelOnlineFreeParser() });

class NovelOnlineFreeParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "div", e => e.className === "chapter-list")
        let chapters = (menu === null) ? [] : this.buildChapterList(menu);
        return Promise.resolve(chapters);
    };

    buildChapterList(menu) {
        return util.getElements(menu, "a").reverse().map(
           a => ({sourceUrl: a.href, title: a.getAttribute("title")})
       );
    };
    
    findContent(dom) {
        return util.getElement(dom.body, "div", e => e.className.startsWith("vung_doc"));
    };

    // title of the story
    extractTitle(dom) {
        return util.getElement(dom.body, "h1").textContent;
    };

    extractAuthor(dom) {
        let link = util.getElement(dom.body, "a", e => e.pathname.includes("search_author"));
        return (link == null) ? super.extractAuthor(dom) : link.textContent;
    };

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return util.getElement(dom.body, "h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", e => e.className.startsWith("entry-header"));
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
