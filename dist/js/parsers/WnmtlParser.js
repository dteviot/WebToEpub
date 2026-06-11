"use strict";

//dead url/ parser
parserFactory.register("wnmtl.com", () => new WnmtlParser());
class WnmtlParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("article div.t a")]
            .filter(link => link.parentElement.parentElement.className !== "text-mutedxxx")
            .map(link => util.hyperLinkToChapter(link));
        return Promise.resolve(items);
    }

    findContent(dom) {
        util.removeElements(dom.querySelectorAll("div#ct div.article-social"));
        return dom.querySelector("div#ct");
    }

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("article header h2, article header h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.article-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "p.focus");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article p.time, article p.note")];
    }
}
