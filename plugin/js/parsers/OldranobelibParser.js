"use strict";

parserFactory.register("old.ranobelib.me", () => new OldranobelibParser());

class OldranobelibParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let base = this.makeChapterBaseUrl(dom);
        let json = this.getJsonWithChapters(dom);
        return json.map(j => this.jsonToChapters(j, base));
    }

    getJsonWithChapters(dom) {
        let startString = "window.__CONTENT__ = ";
        let scriptElement = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes(startString))[0];
        return util.locateAndExtractJson(scriptElement.textContent, startString)
    }

    makeChapterBaseUrl(dom) {
        let base = new URL(dom.baseURI);
        let tip = base.pathname.split("/").pop();
        return `https://old.ranobelib.me/old/${tip}/read/`
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

    extractTitleImpl(dom) {
        return dom.querySelector(".media-name__main");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".media-sidebar .media-info-list__item span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    findChapterTitle(dom) {
        return dom.querySelector("[data-media-down].reader-header-action__title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".media-cover");
    }
}
