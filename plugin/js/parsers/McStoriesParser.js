/*
  parses mcstories.com
  Notes:
  * For this to work, need to go to page with set of chapters.
*/
"use strict";

parserFactory.register("mcstories.com", function() { return new McStoriesParser(); });

class McStoriesParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chaptersElement = dom.querySelector("table#index, div.chapter");
        return Promise.resolve(util.hyperlinksToChapterList(chaptersElement));
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("article a[href*='/Authors/']");
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    }

    getInformationEpubItemChildNodes(dom) {
        return [ util.dctermsToTable(dom) ];
    }
}
