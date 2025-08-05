"use strict";

parserFactory.register("wanderinginn.com", () => new WanderinginnParser());

class WanderinginnParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("#table-of-contents a:not(.book-title-num)")]
            .map(a => util.hyperLinkToChapter(a));
    }
    
    extractTitleImpl() {
        return "The Wandering Inn";
    }
    
    extractAuthor() {
        return "pirateaba";
    }
    
    removeNextAndPreviousChapterHyperlinks(webPage, content) {
        util.removeElements(content.querySelectorAll("a[href*='https://wanderinginn.com/']"));
    }
}
