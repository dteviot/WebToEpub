/*
  parses mcstories.com
  Notes:
  * For this to work, need to go to page with set of chapters.
*/
"use strict";

parserFactory.register("mcstories.com", function() { return new McStoriesParser() });

class McStoriesParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [];
        let chaptersElement = util.getElement(dom, "table", e => (e.id === "index") );
        if (chaptersElement !== null) {
            chapters = util.hyperlinksToChapterList(chaptersElement);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return util.getElement(dom, "article");
    }

    extractAuthor(dom) {
        let article = util.getElement(dom.body, "article");
        let author = util.getElement(article, "a", e => (e.pathname.indexOf("/Authors/") !== -1));
        return (author === null) ? super.extractAuthor(dom) : author.innerText;
    };

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
