/*
  parser for liberspark.com
*/
"use strict";

//dead url/ parser
parserFactory.register("liberspark.com", () => new LibersparkParser());
//dead url
parserFactory.register("veratales.com", () => new LibersparkParser());

class LibersparkParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        // Page in browser has chapter links reduced to 5
        // Fetch page again to get all chapter links.
        return HttpClient.wrapFetch(dom.baseURI).then(function(xhr) {
            let table = xhr.responseXML.querySelector("table#novel-chapters-list");
            return util.hyperlinksToChapterList(table).reverse();
        });
    }

    findContent(dom) {
        return dom.querySelector("div#chapter_body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.card-header");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-synopsis")];
    }    
}
