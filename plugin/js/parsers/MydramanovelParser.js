"use strict";

parserFactory.register("mydramanovel.com", () => new MydramanovelParser());

class MydramanovelParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".td-big-grid-flex-posts .entry-title a, .tdb-category-loop-posts .entry-title a")]
            .map(a => this.hyperLinkToChapter(a));
    }

    hyperLinkToChapter(link) {
        return {
            sourceUrl: link.href,
            title: link.getAttribute("title") || link.textContent
        };
    }

    findContent(dom) {
        return dom.querySelector(".tdb_single_content .tdb-block-inner") ||
            dom.querySelector("div.td-post-content") ||
            dom.querySelector(".td-post-content") ||
            dom.querySelector(".tdb-block-inner");
    }

    async fetchChapter(url) {
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    isCustomError(response) {
        let title = response?.responseXML?.querySelector("title")?.textContent;
        return title === "Just a moment..." ||
            (title && title.includes("Cloudflare")) ||
            (title && title.includes("Attention Required!"));
    }

    setCustomErrorResponse(url, wrapOptions, response) {
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {
            url: response.response.url,
            status: 403
        };
        newresp.errorMessage = "mydramanovel.com requested a Cloudflare check or blocked the request. Try switching the CORS proxy or using direct mode.";
        return newresp;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tdb-title-text");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        let span = dom.querySelector(".td-big-grid-flex-posts .td-module-thumb span[data-img-url]");
        return span ? (span.getAttribute("data-img-url") ?? null) : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.tdb_category_description .tdb-block-inner")];
    }
}
