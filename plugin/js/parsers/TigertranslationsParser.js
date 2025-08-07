"use strict";

parserFactory.register("tigertranslations.org", () => new TigertranslationsParser());

class TigertranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.the-content");
        this.cleanInitialDom(menu);
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.the-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "p.taxonomies, "+
            ".tiger-after-content, .jp-relatedposts");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".entry-title");
    }

    async fetchChapter(url) {
        let urls = new Set();
        urls.add(url);
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(dom);
        this.cleanInitialDom(content);
        let nextUrl = this.findNextPageOfChapterUrl(content, urls, url);
        while (nextUrl != null) {
            let newDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let newContent = this.findContent(newDom);
            this.cleanInitialDom(newContent);
            nextUrl = this.findNextPageOfChapterUrl(newContent, urls, url);
            util.moveChildElements(newContent, content);
        }
        return dom;
    }

    findNextPageOfChapterUrl(content, urls, url) {
        let chapterName = util.extractFilenameFromUrl(url);
        let candidates = [...content.querySelectorAll("a")]
            .filter(a => util.extractFilename(a) === chapterName)
            .filter(a => !urls.has(a.href));

        let nextPageUrl = null;
        if (0 < candidates.length) {
            nextPageUrl = candidates[0].href;
            urls.add(nextPageUrl);
        }

        let toRemove = [...content.querySelectorAll("a")]
            .filter(this.isTigerTranslationsHost);
        util.removeElements(toRemove);            

        return nextPageUrl;
    }    

    isTigerTranslationsHost(link) {
        return new URL(link.href).host === "tigertranslations.org";        
    }

    cleanInitialDom(element) {
        util.removeChildElementsMatchingSelector(element, "p.taxonomies, "+
            ".tiger-after-content, .jp-relatedposts, .sharedaddy");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.the-content")];
    }

    cleanInformationNode(node) {
        this.cleanInitialDom(node);
        let toRemove = [...node.querySelectorAll("p")]
            .filter(p => p.querySelector("a") !== null);
        util.removeElements(toRemove);
    }
}
