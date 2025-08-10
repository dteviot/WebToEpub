/*
  parses www.noveluniverse.com
*/
"use strict";

//dead url/ parser
parserFactory.register("noveluniverse.com", function() { return new NovelUniverseParser(); });

class NovelUniverseParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        return NovelUniverseParser.fetchRestOfToc(dom, []);
    }

    static fetchRestOfToc(dom, chapterList) {
        let nextPage = NovelUniverseParser.urlOfNextToC(dom);
        let newChapters = NovelUniverseParser.extractPartialChapterList(dom);
        chapterList = chapterList.concat(newChapters);
        if (nextPage.length == 0) {
            return Promise.resolve(chapterList);
        }
        return HttpClient.wrapFetch(nextPage[0].href).then(function(xhr) {
            return NovelUniverseParser.fetchRestOfToc(xhr.responseXML, chapterList);
        });
    }
    
    static urlOfNextToC(dom) {
        return [...dom.querySelectorAll("div.allPagesStyle a")]
            .filter(link => link.textContent === "Next");
    }
    
    static extractPartialChapterList(dom) {
        let list = dom.querySelector("ul#chapters");
        return util.hyperlinksToChapterList(list);
    }

    findContent(dom) {
        return dom.querySelector("div.top_loc");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.info h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        let review = element.querySelector("div.star-review");
        if (review != null) {
            review.parentElement.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.img");
    }
}
