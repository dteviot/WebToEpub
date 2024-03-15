"use strict";

parserFactory.register("tapas.io", () => new TapasParser());
parserFactory.register("m.tapas.io", () => new TapasParser());

class TapasParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let seriesId = dom.querySelector("meta[property='al:android:url']").getAttribute("content").split("/", 4).pop();
        let restUrl = `https://tapas.io/series/${seriesId}/episodes?page=1&sort=OLDEST&max_limit=9999`;
        let body = (await HttpClient.fetchJson(restUrl)).json.data.body;
        let html = new DOMParser().parseFromString(body, "text/html");
        return [...html.querySelectorAll("li")]
            .filter(li => !li.querySelector(".thumb__overlay--locked, .ico--schedule"))
            .map(this.listItemToChapter);
    }

    listItemToChapter(li) {
        return {
            sourceUrl: "https://tapas.io" + li.getAttribute("data-href"),
            title: li.querySelector("a.info__title").textContent.trim()
        };
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".series-root a.title").textContent;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".creator");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.viewer__header p.title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".thumb");
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "article img.js-lazy");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".description__body")];
    }
}
