"use strict";

parserFactory.register("novelarrow.com", () => new NovelArrowParser());

class NovelArrowParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let seen = new Set();
        let chapters = [];
        for (let link of [...dom.querySelectorAll("a")]) {
            if (!this.isChapterLink(link)) {
                continue;
            }
            let chapter = util.hyperLinkToChapter(link);
            let key = util.normalizeUrlForCompare(chapter.sourceUrl);
            if (!seen.has(key)) {
                seen.add(key);
                chapters.push(chapter);
            }
        }
        return chapters;
    }

    isChapterLink(link) {
        let href = link.getAttribute("href") || "";
        return href.includes("/chapter/") && !href.includes("/genre/") && !href.includes("/author/");
    }

    findContent(dom) {
        let selectors = [
            "article",
            "main",
            ".chapter-content",
            "#chapter-content",
            "[class*='chapter']",
            "[id*='chapter']",
            ".entry-content",
            ".content"
        ];
        for (let selector of selectors) {
            let element = dom.querySelector(selector);
            if (element != null && element.textContent.trim().length > 40) {
                return element;
            }
        }
        return dom.querySelector("body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1")
            || dom.querySelector(".novel-title")
            || dom.querySelector(".entry-title")
            || dom.querySelector("meta[property='og:title']")
            || dom.querySelector("title");
    }

    extractAuthor(dom) {
        let authorLink = [...dom.querySelectorAll("a")]
            .find(link => link.href.includes("/author/"));
        return authorLink?.textContent?.trim() || super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("a")]
            .filter(link => link.href.includes("/genre/"))
            .map(link => link.textContent.trim())
            .filter(text => text.length > 0);
        return genres.slice(0, 6).join(", ");
    }

    extractDescription(dom) {
        let metaDescription = dom.querySelector("meta[name='description']")?.getAttribute("content");
        return metaDescription?.trim() || super.extractDescription(dom);
    }

    extractPublisher() {
        return "Novel Arrow";
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("meta[property='og:image']")?.getAttribute("content")
            || dom.querySelector("img[src*='novelarrow.com']")
            || dom.querySelector("img");
        return img?.getAttribute("content") || img?.getAttribute("src") || null;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1, h2, .chapter-title, .entry-title")
            || dom.querySelector("meta[property='og:title']")
            || dom.querySelector("title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "header, nav, footer, aside, form, script, style, noscript, .comments, .comment, .ads, .ad, .social-share");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    isCustomError(response) {
        return response.responseXML?.title === "Just a moment...";
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        return {
            url: url,
            wrapOptions: wrapOptions,
            response: {
                url: checkedresponse.response.url,
                status: 403,
                retryDelay: [80, 40, 20, 10, 5],
            },
            errorMessage: "NovelArrow returned a Cloudflare challenge. Open the page in the browser, pass the check, and retry.",
        };
    }
}
