"use strict";

//dead url
parserFactory.register("novelupdates.online", () => new NovelUpdatesOnlineParser());
parserFactory.register("boxnovel.net", () => new NovelUpdatesOnlineParser());

class NovelUpdatesOnlineParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let fetchedUrls = new Set();
        fetchedUrls.add(dom.baseURI + "/1#chapter-section");
        let chapters = NovelUpdatesOnlineParser.extractPartialChapterList(dom);
        chapterUrlsUI.showTocProgress(chapters);
        let url = NovelUpdatesOnlineParser.nextTocUrl(dom, fetchedUrls);
        while (url != null) {
            let newDom = (await HttpClient.wrapFetch(url)).responseXML;
            let partialList = NovelUpdatesOnlineParser.extractPartialChapterList(newDom);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            url = NovelUpdatesOnlineParser.nextTocUrl(newDom, fetchedUrls);
        }
        return chapters.reverse();
    }

    static nextTocUrl(dom, fetchedUrls) {
        let urls = [...dom.querySelectorAll("a#navigation-ajax")]
            .map(a => a.href)
            .filter(u => !fetchedUrls.has(u));
        if (0 < urls.length) {
            fetchedUrls.add(urls[0]);
            return urls[0];
        }
        return null;
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("#chapter-section ul");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.reading-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-title h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content")];
    }
}
