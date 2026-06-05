"use strict";

//dead url/ parser
parserFactory.register("teenfic.net", () => new TeenficParser());

class TeenficParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = [...dom.querySelectorAll("ul.chapters")].pop();
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a[itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#story-detail");
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(dom);
        let pageUrls = this.findOtherPagesOfChapter(dom);
        for (let nextUrl of pageUrls) {
            let newDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let newContent = this.findContent(newDom);
            util.moveChildElements(newContent, content);
        }
        return dom;
    }

    findOtherPagesOfChapter(dom) {
        let seen = new Set();
        let urls = [];
        let links = [...dom.querySelectorAll("ul.page li:not(.active) a")]
            .map(link => link.href);
        for (let link of links) {
            if (!seen.has(link)) {
                urls.push(link);
                seen.add(link);
            }
        }
        return urls;
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.description")];
    }
}
