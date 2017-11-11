/*
  Parser for https://fantasy-books.live/
*/
"use strict";

parserFactory.register("fantasy-books.live", function() { return new FantasyBooksParser() });
class FantasyBooksParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        // Page in browser has links reduced to "Number of links to show"
        // Fetch new page to get all chapter links.
        return HttpClient.wrapFetch(dom.baseURI).then(function (xhr) {
            let table = xhr.responseXML.querySelector("tbody");
            return util.hyperlinksToChapterList(table);
        });
    }

    findContent(dom) {
        return dom.querySelector("article");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        if (title !== null) {
            return title.getAttribute("content");
        }
        return super.extractTitle(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("div.team, div.x-donate-1,"+
            " div.navigation, div.navi, header.entry-header"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#cs-content");
    }
}
