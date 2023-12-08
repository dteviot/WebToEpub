"use strict";

parserFactory.register("freewebnovel.com", () => new FreeWebNovelParser());
parserFactory.register("bednovel.com", () => new FreeWebNovelParser());
parserFactory.register("innnovel.com", () => new FreeWebNovelParser());
parserFactory.register("libread.com", () => new FreeWebNovelParser());
parserFactory.register("novellive.com", () => new NovelliveParser());

class FreeWebNovelParser extends Parser {

    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#idData");
        return util.hyperlinksToChapterList(menu);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tit");
    }

    extractAuthor(dom) {
        return dom.querySelector("[title=Author]").parentNode.querySelector("a").textContent;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelector("[title=Genre]").parentNode.querySelectorAll("a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic");
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.chapter");
    }

    findContent(dom) {
        return dom.querySelector("div.txt");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.inner")];
    }
}

class NovelliveParser extends FreeWebNovelParser {

    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    getUrlsOfTocPages(dom) {
        // lastUrl should be example https://novellive.com/book/<some-novel-name>/<index>
        let lastUrl = [...dom.querySelectorAll(".page a.index-container-btn")]?.pop()?.href;
        let urls = [];
        if (lastUrl) {
            let lastTocIndex = lastUrl.lastIndexOf("/");
            let lastIndexPageName = lastUrl.substring(lastTocIndex + 1);
            let lastIndex = parseInt(lastIndexPageName);
            let tocHasMultiplePages = !isNaN(lastIndex);
            if (tocHasMultiplePages) {
                let baseUrl = lastUrl.substring(0, lastTocIndex + 1);
                for (let i = 2; i <= lastIndex; ++i) {
                    urls.push(baseUrl + i);
                }
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelector(".m-newest2").querySelectorAll("ul li a")]
            .map(a => util.hyperLinkToChapter(a));
    }
}
