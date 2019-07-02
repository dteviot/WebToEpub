/*
  Parser for novelfull.com
*/
"use strict";

parserFactory.register("novelfull.com", function () { return new NovelfullParser() });

class NovelfullParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            NovelfullParser.extractPartialChapterList,
            NovelfullParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    };

    static getUrlsOfTocPages(dom) {
        let link = dom.querySelector("li.last a");
        let urls = [];
        if (link != null) {
            let limit = link.getAttribute("data-page") || "-1";
            limit = parseInt(limit) + 1;
            for (let i = 1; i <= limit; ++i) {
                link.search = `?page=${i}&per-page=50`;
                urls.push(link.href);
            }
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(link => util.hyperLinkToChapter(link));
    }

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.querySelector("div#chapter-content");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    };

    extractAuthor(dom) {
        let authorLink = dom.querySelector("div.info a");
        return (authorLink === null) ? super.extractAuthor(dom) : authorLink.textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector("a.chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text, div.info")];
    }
}
