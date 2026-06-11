
"use strict";

parserFactory.register("goldennovel.com", () => new GoldennovelParser());

class GoldennovelParser extends Parser {
    async getChapterUrls(dom) {
        let menu = dom.querySelector("div#content-b ul.list.clearfix");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.align-center");
    }

    extractAuthor(dom) {
        let authorSpan = dom.querySelector("span.tip");
        if (authorSpan && authorSpan.textContent.includes("Author:")) {
            let authorLink = authorSpan.parentElement.querySelector("a");
            if (authorLink) {
                return authorLink.textContent;
            }
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let coverImg = dom.querySelector("div.cover img");
        return coverImg ? coverImg.src : null;
    }
}
