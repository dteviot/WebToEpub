"use strict";

parserFactory.register("old.ranobelib.me", () => new OldranobelibParser());
parserFactory.register("ranobelib.me", () => new OldranobelibParser());

class OldranobelibParser extends Parser {
    constructor() {
        super();
        this.homedom = "";
    }

    async getChapterUrls(dom) {
        if (dom.baseURI.includes("https://ranobelib.me/ru/book/")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI.replace("https://ranobelib.me/ru/book/", "https://old.ranobelib.me/old/manga/"))).responseXML;
        }
        let base = this.makeChapterBaseUrl(dom);
        let json = this.getJsonWithChapters(dom);
        return json.map(j => this.jsonToChapters(j, base));
    }
    
    async loadEpubMetaInfo(dom) {
        if (dom.baseURI.includes("https://ranobelib.me/ru/book/")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI.replace("https://ranobelib.me/ru/book/", "https://old.ranobelib.me/old/manga/"))).responseXML;
        }
        this.homedom = dom;
        return;
    }

    getJsonWithChapters(dom) {
        let startString = "window.__CONTENT__ = ";
        let scriptElement = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes(startString))[0];
        return util.locateAndExtractJson(scriptElement.textContent, startString);
    }

    makeChapterBaseUrl(dom) {
        let base = new URL(dom.baseURI);
        let tip = base.pathname.split("/").pop();
        return `https://old.ranobelib.me/old/${tip}/read/`;
    }

    jsonToChapters(json, base) {
        let name = json.name;
        if (!util.isNullOrEmpty(name)) {
            name = " - " + name;
        }
        return ({
            sourceUrl: `${base}v${json.volume}/c${json.number}`,
            title: `Том ${json.volume} Глава ${json.number}${name}`
        });
    }

    findContent(dom) {
        return dom.querySelector(".reader-container");
    }

    extractTitleImpl() {
        return this.homedom.querySelector(".media-name__main");
    }

    extractAuthor() {
        let authorLabel = this.homedom.querySelector(".media-sidebar .media-info-list__item span");
        return authorLabel?.textContent ?? super.extractAuthor(this.homedom);
    }

    extractLanguage() {
        return this.homedom.querySelector("html").getAttribute("lang");
    }

    findChapterTitle(dom) {
        return dom.querySelector("[data-media-down].reader-header-action__title");
    }

    findCoverImageUrl() {
        return util.getFirstImgSrc(this.homedom, ".media-cover");
    }
}
