"use strict";

parserFactory.register("novelfull.com", function () { return new NovelfullParser() });
parserFactory.register("allnovel.org", function () { return new NovelfullParser() });
parserFactory.register("allnovelfull.com", function () { return new NovelfullParser() });
parserFactory.register("freenovelsread.com", function () { return new NovelfullParser() });
parserFactory.register("novel-bin.net", function () { return new NovelHyphenBinParser() });
parserFactory.register("novel35.com", function () { return new Novel35Parser() });

class NovelfullParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    };

    getUrlsOfTocPages(dom) {
        let link = dom.querySelector("li.last a");
        let urls = [];
        if (link != null) {
            let limit = link.getAttribute("data-page") || "-1";
            limit = parseInt(limit) + 1;
            for (let i = 1; i <= limit; ++i) {
                urls.push(NovelfullParser.buildUrlForTocPage(link, i));
            }
        }
        return urls;
    }

    static buildUrlForTocPage(link, i) {
        let hostname = link.hostname;
        if (hostname === "freenovelsread.com")
        {
            link.pathname = link.pathname.split("/")[1] + "/" + i;
        } else {
            link.search = `?page=${i}&per-page=50`;
        }
        return link.href;
    }

    extractPartialChapterList(dom) {
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
        return dom.querySelector("a.chapter-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text, div.info")];
    }
}

class Novel35Parser extends NovelfullParser{
    constructor() {
        super();
    }

    getUrlsOfTocPages(dom) {
        let urls = []
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a:not([rel])")];
        if (0 < paginateUrls.length) {
            let url = new URL(paginateUrls.pop().href);
            let maxPage = url.searchParams.get("page");
            for(let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    };

    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-title").textContent;
    }    
}

class NovelHyphenBinParser extends NovelfullParser{
    constructor() {
        super();
    }

    findContent(dom) {
        return dom.querySelector("#chr-content");
    };

    findChapterTitle(dom) {
        return dom.querySelector("h2").textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        let marks = [...element.querySelectorAll(".novel_online")];
        for(let mark of marks) {
            mark.nextSibling.nextSibling.remove();
            mark.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
