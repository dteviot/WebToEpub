/*
  Parser for novelfull.com
*/
"use strict";

parserFactory.register("novelfull.com", function () { return new NovelfullParser() });

class NovelfullParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let pagesWithToc = NovelfullParser.listUrlsHoldingChapterLists(dom);
        if (pagesWithToc.length <= 1) {
            let chapters = NovelfullParser.extractPartialChapterList(dom);
            return Promise.resolve(chapters);
        }
        return Promise.all(
            pagesWithToc.map(volume => NovelfullParser.fetchPartialChapterList(volume))
        ).then(function (tocFragments) {
            let chapters = [];
            for (let fragment of tocFragments) {
                chapters = chapters.concat(fragment);
            }
            return chapters;
        });
    };

    static listUrlsHoldingChapterLists(dom) {
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

    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return NovelfullParser.extractPartialChapterList(xhr.responseXML);
        });
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
        let titleLink = dom.querySelector("a.chapter-title");
        if (titleLink != null) {
            let title = dom.createElement("h1");
            title.appendChild(dom.createTextNode(titleLink.textContent));
            return title;
        }
        return null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text, div.info")];
    }
}
