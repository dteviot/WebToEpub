"use strict";

parserFactory.register("truyenfull.vn", () => new TruyenfullParser());

class TruyenfullParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = TruyenfullParser.extractPartialChapterList(dom);
        let restUrls = TruyenfullParser.getUrlsOfTocPages(dom);
        return Promise.all(
            restUrls.map(url => TruyenfullParser.fetchPartialChapterList(url))
        ).then(function (tocFragments) {
            return tocFragments.reduce((a, c) => a.concat(c), chapters);
        });
    };

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let input = dom.querySelector("input#total-page");
        if (input != null) {
            let totalp = parseInt(input.getAttribute("value"));
            for(let i = 2; i <= totalp; ++i ) {
                urls.push(`${dom.baseURI}trang-${i}/`);
            }
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(link => util.hyperLinkToChapter(link));
    }

    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return TruyenfullParser.extractPartialChapterList(xhr.responseXML);
        });
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-c");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a[itemprop='author']");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        let title = dom.querySelector("a.chapter-title")
        return (title === null) ? super.findChapterTitle(dom) : title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text")];
    }
}
