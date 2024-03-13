"use strict";

parserFactory.register("allnovel.org", () => new NovelfullParser());
parserFactory.register("allnovelbin.net", () => new NovelfullParser());
parserFactory.register("allnovelfull.com", () => new NovelfullParser());
parserFactory.register("allnovelfull.org", () => new NovelfullParser());
parserFactory.register("allnovelfull.net", () => new NovelfullParser());
parserFactory.register("allnovelnext.com", () => new NovelfullParser());
parserFactory.register("boxnovelfull.com", () => new NovelfullParser());
parserFactory.register("freenovelsread.com", () => new NovelfullParser());
parserFactory.register("freewn.com", () => new NovelfullParser());
parserFactory.register("novel-bin.com", () => new NovelHyphenBinParser());
parserFactory.register("novel-bin.net", () => new NovelHyphenBinParser());
parserFactory.register("novel-bin.org", () => new NovelHyphenBinParser());
parserFactory.register("novel-next.com", () => new NovelfullParser());
parserFactory.register("novel35.com", () => new Novel35Parser());
parserFactory.register("novelactive.org", () => new NovelfullParser());
parserFactory.register("novelbin.com", () => new NovelfullParser());
parserFactory.register("novelbin.me", () => new NovelfullParser());
parserFactory.register("novelbin.net", () => new NovelfullParser());
parserFactory.register("novelebook.net", () => new NovelfullParser());
parserFactory.register("novelfull.com", () => new NovelfullParser());
parserFactory.register("novelfull.net", () => new NovelfullParser());
parserFactory.register("novelfullbook.com", () => new NovelfullParser());
parserFactory.register("novelmax.net", () => new NovelfullParser());
parserFactory.register("noveltop1.org", () => new NovelfullParser());
parserFactory.register("noveltrust.net", () => new NovelfullParser());
parserFactory.register("novelusb.com", () => new NovelfullParser());
parserFactory.register("novelusb.net", () => new NovelfullParser());
parserFactory.register("readnovelfull.me", () => new NovelfullParser());
parserFactory.register("thenovelbin.org", () => new NovelfullParser());

class NovelfullParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
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
        return dom.querySelector("#chr-content")
            || dom.querySelector("#chapter-content");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    };

    extractAuthor(dom) {
        let items = [...dom.querySelectorAll("ul.info-meta li")]
            .filter(u => u.querySelector("h3")?.textContent === "Author:")
            .map(u => u.querySelector("a")?.textContent)
        return 0 < items.length 
            ? items[0]
            : super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2").textContent;
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

    removeUnwantedElementsFromContentElement(element) {
        let marks = [...element.querySelectorAll(".novel_online")];
        for(let mark of marks) {
            mark.nextSibling.nextSibling.remove();
            mark.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
