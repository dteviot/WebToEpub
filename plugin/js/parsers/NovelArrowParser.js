"use strict";

parserFactory.register("novelarrow.com", () => new NovelArrowParser());

class NovelArrowParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let chapters = this.getChapterUrlsFromInitialChapterList(dom);
        return chapters.length > 0
            ? chapters
            : util.hyperlinksToChapterList(dom, link => this.isChapterLink(link) && !this.isReadNowLink(link));
    }

    getChapterUrlsFromInitialChapterList(dom) {
        if (!dom) {
            return [];
        }

        let script = [...dom.querySelectorAll("script")]
            .find(scriptElement => (scriptElement.textContent || scriptElement.innerText || "").includes("initialChapterList"));
        if (!script) {
            return [];
        }

        try {
            return this.findInitialChapterList(this.extractJsonObject(script.textContent || script.innerText || ""), dom);
        } catch (e) {
            return [];
        }
    }

    extractJsonObject(scriptText) {
        let markerIndex = scriptText.indexOf("initialChapterList");
        if (markerIndex < 0) {
            return null;
        }

        for (let index = markerIndex; index >= 0; --index) {
            if (scriptText[index] !== "{") {
                continue;
            }

            let candidate = this.extractBalancedJson(scriptText, index);
            if (candidate == null) {
                continue;
            }

            try {
                return JSON.parse(candidate);
            } catch (e) {
                // Try the next brace if this one is not a valid JSON object.
            }
        }

        return null;
    }

    extractBalancedJson(text, startIndex) {
        let depth = 0;
        let isString = false;
        let isEscaped = false;

        for (let index = startIndex; index < text.length; ++index) {
            let char = text[index];
            if (isString) {
                if (isEscaped) {
                    isEscaped = false;
                } else if (char === "\\") {
                    isEscaped = true;
                } else if (char === "\"") {
                    isString = false;
                }
                continue;
            }

            if (char === "\"") {
                isString = true;
            } else if (char === "{") {
                ++depth;
            } else if (char === "}") {
                --depth;
                if (depth === 0) {
                    return text.substring(startIndex, index + 1);
                }
            }
        }

        return null;
    }

    findInitialChapterList(value, dom) {
        if (Array.isArray(value?.initialChapterList)) {
            return value.initialChapterList
                .filter(chapter => chapter && typeof chapter === "object")
                .map(chapter => ({
                    sourceUrl: this.getChapterUrl(chapter.chapter_id || chapter.slug || chapter.id, dom),
                    title: chapter.chapter_name || chapter.name || chapter.title || "",
                    newArc: null
                }));
        }

        if (value && typeof value === "object") {
            for (let child of Object.values(value)) {
                let chapters = this.findInitialChapterList(child, dom);
                if (chapters.length > 0) {
                    return chapters;
                }
            }
        }
        return [];
    }

    getChapterUrl(path, dom) {
        if (!path) {
            return "";
        }
        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        let baseUrl = this.getChapterBaseUrl(dom);
        let slug = this.getNovelSlug(dom);
        return new URL(path.startsWith("/") ? path : (slug ? `/chapter/${slug}/${path}` : path), baseUrl).href;
    }

    getChapterBaseUrl(dom) {
        let url = dom?.querySelector("link[rel='canonical']")?.href
            || dom?.querySelector("meta[property='og:url']")?.getAttribute("content")
            || dom?.baseURI
            || "https://novelarrow.com";
        try {
            return new URL(url).origin;
        } catch (e) {
            return "https://novelarrow.com";
        }
    }

    getNovelSlug(dom) {
        let url = dom?.querySelector("link[rel='canonical']")?.href
            || dom?.querySelector("meta[property='og:url']")?.getAttribute("content")
            || dom?.baseURI
            || "";
        let match = url.match(/\/novel\/([^/?#]+)/);
        return match ? match[1] : "";
    }

    isChapterLink(link) {
        let href = link.getAttribute("href") || "";
        return href.includes("/chapter/") && !href.includes("/genre/") && !href.includes("/author/");
    }

    isReadNowLink(link) {
        return (link.textContent || "").trim().toLowerCase() === "read now";
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
