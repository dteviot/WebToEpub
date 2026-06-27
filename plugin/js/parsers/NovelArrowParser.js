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
        let authorLink = dom.querySelector("a[href*='/author/']");
        let author = authorLink?.textContent?.trim();
        if (!author && authorLink) {
            let href = authorLink.getAttribute("href") || authorLink.href || "";
            let segments = href.split("/").filter(Boolean);
            author = segments.pop() || "";
        }
        return author || dom.querySelector("meta[name='author']")?.getAttribute("content")?.trim() || super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return [...dom.querySelectorAll("a[href*='/genre/']")]
            .map(link => link.textContent.trim())
            .filter(Boolean)
            .slice(0, 6)
            .join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("meta[name='description']")?.getAttribute("content")?.trim()
            || super.extractDescription(dom);
    }

    extractPublisher() {
        return "Novel Arrow";
    }

    findCoverImageUrl(dom) {
        if (!dom) {
            return null;
        }

        let metaImage = [
            "meta[property='og:image']",
            "meta[property='og:image:secure_url']",
            "meta[name='twitter:image']",
            "meta[name='image']"
        ]
            .map(selector => dom.querySelector(selector)?.getAttribute("content")?.trim())
            .find(Boolean);

        if (metaImage) {
            return metaImage;
        }

        return dom.querySelector("img[src*='novelarrow.com']")?.src
            || util.getFirstImgSrc(dom, "body");
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
