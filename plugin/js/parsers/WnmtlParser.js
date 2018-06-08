"use strict";

parserFactory.register("wnmtl.com", function() { return new WnmtlParser() });
class WnmtlParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("article div.t a")]
            .filter(link => link.parentElement.parentElement.className !== "text-mutedxxx")
            .map(link => util.hyperLinkToChapter(link, null));
        return Promise.resolve(items);
    };

    findContent(dom) {
        util.removeElements(dom.querySelectorAll("div#ct div.article-social"));
        return dom.querySelector("div#ct");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        return dom.querySelector("article header h2").textContent.trim();
    };

    findChapterTitle(dom) {
        return dom.querySelector("h1.article-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "p.focus");
    }

    getInformationEpubItemChildNodes(dom) {
        let div = document.createElement("div");
        for(let e of [...dom.querySelectorAll("article p.time, article p.note")]) {
            div.appendChild(e.cloneNode(true));
        }
        return div;
    }
}
