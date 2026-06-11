"use strict";

parserFactory.register("mydramanovel.com", () => new MydramanovelParser());

class MydramanovelParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
        // mydramanovel.com aggressively rate-limits scrapers.
        // 3 s between requests prevents 429 errors from the CORS proxies.
        this.minimumThrottle = 3000;
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
        // Try the most specific selector first (clean story content, no inline styles)
        let el = dom.querySelector(".tdb_single_content .tdb-block-inner");
        // Fall back to the outer content wrapper
        if (el == null) el = dom.querySelector("div.td-post-content, .td-post-content");
        // Guard: a proxy error / rate-limit page may match .tdb-block-inner with no text.
        // Only accept the element if it has meaningful text content (>50 chars).
        if (el == null) {
            let candidate = dom.querySelector(".tdb-block-inner");
            if (candidate && candidate.textContent.trim().length > 50) {
                el = candidate;
            }
        }
        return el;
    }

    async fetchChapter(url) {
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    isCustomError(response) {
        let title = response?.responseXML?.querySelector("title")?.textContent || "";
        // Cloudflare challenge / WAF block
        if (title === "Just a moment..." ||
            title.includes("Cloudflare") ||
            title.includes("Attention Required!")) {
            return true;
        }
        // Some proxies (api.codetabs.com) return an HTML error page instead of
        // the actual chapter when rate-limited.  Detect this by checking that the
        // expected content wrapper is missing AND the page has very little text.
        let bodyText = response?.responseXML?.body?.textContent?.trim() || "";
        let hasContent = response?.responseXML?.querySelector(
            ".tdb_single_content, .td-post-content, .tdb-block-inner"
        );
        if (!hasContent && bodyText.length < 500) {
            return true;
        }
        return false;
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
