"use strict";

parserFactory.register("novelsquare.blog", () => new NovelsquareParser());

class NovelsquareParser extends Parser {
    constructor() {
        super();
    }
    
    async getChapterUrls(dom, chapterUrlsUI) {
        if (!dom.baseURI.match(new RegExp("/chapters$"))) {
            dom = (await HttpClient.wrapFetch(dom.baseURI + "/chapters")).responseXML;
        }
        let baseUrl = dom.baseURI;
        let nextTocIndex = 1;
        let maxToCnumber = [...dom.querySelectorAll("div.pagenav .page-link")];
        maxToCnumber = maxToCnumber.concat(1);
        let getMax = (a, b) => Math.max(parseInt(a)?parseInt(a):0, parseInt(b)?parseInt(b):0);
        maxToCnumber = maxToCnumber.map(a => a.textContent).reduce(getMax);
        let nextTocPageUrl = function(_dom, chapters, lastFetch) {
            return ((nextTocIndex <= maxToCnumber) && (0 < lastFetch.length))
                ? `${baseUrl}?page=${++nextTocIndex}`
                : null;
        };

        return (await this.walkTocPages(dom,
            NovelsquareParser.getChapterUrlsFromTocPage,
            nextTocPageUrl,
            chapterUrlsUI
        ));
    }

    static getChapterUrlsFromTocPage(dom) {
        let menu = dom.querySelector("div#chpagedlist .chapter-list");
        return (menu === null)
            ? []
            :  util.hyperlinksToChapterList(menu);
    }
    
    async loadEpubMetaInfo(dom) {
        if (dom.baseURI.match(new RegExp("/chapters$"))) {
            dom = (await HttpClient.wrapFetch(dom.baseURI.slice(0, dom.baseURI.length - 9))).responseXML;
        }
        this.dom = dom;
        return;
    }

    extractTitleImpl() {
        return this.dom.querySelector("h1 .novel-title");
    }

    extractAuthor() {
        let authorLabel = this.dom.querySelector("div.author a > span");
        return authorLabel?.textContent ?? super.extractAuthor(this.dom);
    }

    extractSubject() {
        let tags = ([...this.dom.querySelectorAll("div.categories a")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription() {
        return this.dom.querySelector("div.m-desc .inner").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".box-notification");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl() {
        let coverImage = this.dom.querySelector(".cover");
        return coverImage === null
            ? null
            : coverImage.querySelector("img").src;
    }
}