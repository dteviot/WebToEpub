/*
  parser for http://novelplanet.com
*/
"use strict";

// Use one or more of these to specify when the parser is to be used
parserFactory.register("novelplanet.com", function() { return new NovelPlanetParser() });

class NovelPlanetParser extends Parser{
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    getChapterUrls(dom) {
        let chapters = null;
        let chapterListHeader = util.getElement(dom, "h3");
        if (chapterListHeader !== null)
        {
            chapters = util.hyperlinksToChapterList(chapterListHeader.parentElement);
        } else {
            let chapterLinks = util.getElement(dom, "a", e => !util.isNullOrEmpty(e.getAttribute("title")));
            chapters = chapterLinks.map(a => util.hyperLinkToChapter(a)); 
        }
        return Promise.resolve(chapters.reverse());
    };

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return util.getElement(dom, "div", e => e.id === "divReadContent");
    };

    // title of the story
    extractTitle(dom) {
        let title = util.getElement(dom, "a", e => e.className === "title");
        return title === null ? super.extractTitle(dom) : title.textContent;
    };

    extractAuthor(dom) {
        let element = util.getElement(dom, "a", a => a.search.startsWith("?author="))
        return (element === null) ? super.extractAuthor(dom) : element.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", e => e.className === "post-previewInDetails");
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h4");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
