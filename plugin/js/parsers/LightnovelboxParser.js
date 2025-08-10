"use strict";

parserFactory.register("lightnovelbox.com", () => new LightnovelboxParser());

class LightnovelboxParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let links = [...dom.querySelectorAll("ul.chapter-list a")];
        let chapters = LightnovelboxParser.linksToChapters(links);
        let urls = LightnovelboxParser.getUrlsOfTocPages(dom);
        for (let url of urls) {
            let rawDom = (await HttpClient.fetchJson(url)).json.chapters;
            links = [...util.sanitize(rawDom).querySelectorAll("a")];
            let partialList = LightnovelboxParser.linksToChapters(links);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    static getUrlsOfTocPages(dom) {
        let ids = [...dom.querySelectorAll("div.pagination-container a[id]")]
            .map(a => parseInt(a.id));
        let last = Math.max(...ids);
        let urls = [];
        if (last !== null) {
            let name = new URL(dom.baseURI).pathname.split("/").pop();
            let prefix = `https://lightnovelbox.com/api/novels/${name}/chapters?page=`;
            for (let i = 2; i <= last; ++i) {
                urls.push(prefix + i);
            }
        }
        return urls;
    }

    static linksToChapters(links) {
        return links.map(link => ({
            sourceUrl:  "https://lightnovelbox.com" + new URL(link.href).pathname,
            title: link.querySelector(".chapter-title").textContent.trim(),
        }));
    }

    findContent(dom) {
        return dom.querySelector("div.chapter__content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.main-head h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure.cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary")];
    }
}
