"use strict";

parserFactory.register("novelhub.net", () => new NovelhubParser());

class NovelhubParser extends Parser {
    constructor() {
        super();
    }

    // Extract the base novel URL from any novelhub URL (main page, chapters page, or chapter page)
    static getNovelBaseUrl(url) {
        // Match: https://novelhub.net/novel/<slug>
        let m = url.match(/^(https?:\/\/novelhub\.net\/novel\/[^/?#]+)/);
        return m ? m[1] : null;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        // Always work from the novel's main page URL, regardless of what URL was given
        let startUrl = dom.baseURI || "";
        let novelBase = NovelhubParser.getNovelBaseUrl(startUrl);
        if (!novelBase) {
            // Fallback: try to extract from og:url meta tag
            let ogUrl = dom.querySelector("meta[property='og:url']")?.getAttribute("content") || "";
            novelBase = NovelhubParser.getNovelBaseUrl(ogUrl);
        }
        if (!novelBase) {
            throw new Error("NovelhubParser: Could not determine the novel base URL from: " + startUrl);
        }

        let chaptersPageUrl = novelBase + "/chapters?sort=asc&page=1";
        let allChapters = [];
        let page = 1;

        while (chaptersPageUrl) {
            let response = await HttpClient.wrapFetch(chaptersPageUrl);
            let pageDom = response.responseXML;
            if (!pageDom) break;

            // Extract chapters from this page using raw getAttribute to avoid baseURI issues
            let links = pageDom.querySelectorAll("a[href*='/chapter-']");
            let seenOnPage = new Set();
            for (let a of links) {
                // Use getAttribute to get the raw href string (avoids DOM resolution issues)
                let href = a.getAttribute("href") || "";
                // Skip non-chapter links (e.g. JS-rendered placeholders or nav links)
                if (!href.match(/\/chapter-\d+$/)) continue;
                // Make absolute if relative
                if (href.startsWith("/")) {
                    href = "https://novelhub.net" + href;
                }
                if (seenOnPage.has(href)) continue;
                seenOnPage.add(href);

                // Title: prefer h3, fall back to chapter number from URL
                let titleEl = a.querySelector("h3");
                let title = titleEl ? titleEl.textContent.trim() : "";
                if (!title || title === "--") {
                    let numSpan = a.querySelector("span");
                    let num = numSpan ? numSpan.textContent.trim() : "";
                    let chNum = href.match(/chapter-(\d+)$/)?.[1] || "";
                    title = "Chapter " + (chNum || num);
                }

                allChapters.push({ sourceUrl: href, title: title });
            }

            if (chapterUrlsUI) {
                chapterUrlsUI.showTocProgress(allChapters.slice(allChapters.length - seenOnPage.size));
            }

            // Find next page link using raw attribute
            let nextLink = pageDom.querySelector("a[rel='next']");
            let nextHref = nextLink ? nextLink.getAttribute("href") : null;
            if (nextHref) {
                if (nextHref.startsWith("/")) {
                    nextHref = "https://novelhub.net" + nextHref;
                }
                chaptersPageUrl = nextHref;
                page++;
            } else {
                chaptersPageUrl = null;
            }

            if (!chaptersPageUrl) break;
            await this.rateLimitDelay();
        }

        return allChapters;
    }

    findContent(dom) {
        return dom.querySelector("article#chapter-content");
    }

    extractTitleImpl(dom) {
        // h1 on the novel page (inside the hero section)
        let h1 = dom.querySelector("h1");
        if (h1) return h1.textContent.trim();
        // Fallback: og:title
        let ogTitle = dom.querySelector("meta[property='og:title']");
        if (ogTitle) {
            return ogTitle.getAttribute("content")
                .replace(/^Read\s+/i, "")
                .replace(/\s+Online Free\s*\|\s*NovelHub$/i, "")
                .trim();
        }
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        // Try schema JSON-LD first
        let jsonLd = dom.querySelector("script[type='application/ld+json']");
        if (jsonLd) {
            try {
                let data = JSON.parse(jsonLd.textContent);
                if (data.author?.name) return data.author.name;
                if (Array.isArray(data.author) && data.author[0]?.name) return data.author[0].name;
            } catch (e) { /* ignore */ }
        }
        let authorMeta = dom.querySelector("meta[name='author']") || dom.querySelector("meta[property='book:author']");
        if (authorMeta) return authorMeta.getAttribute("content");
        // Try visible author text on page
        let authorEl = dom.querySelector(".novel-author, [data-author]");
        if (authorEl) return authorEl.textContent.trim();
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let descMeta = dom.querySelector("meta[property='og:description']") || dom.querySelector("meta[name='description']");
        if (descMeta) return descMeta.getAttribute("content").trim();
        return super.extractDescription(dom);
    }

    findChapterTitle(dom) {
        // Prefer the meta tag for chapter title
        let titleMeta = dom.querySelector("meta[name='chapter-title']");
        if (titleMeta) return titleMeta.getAttribute("content");
        // Then h4 inside article
        let h4 = dom.querySelector("article#chapter-content h4");
        if (h4) return h4.textContent.trim();
        // Then og:title for the chapter page
        let ogTitle = dom.querySelector("meta[property='og:title']");
        if (ogTitle) return ogTitle.getAttribute("content");
        return super.findChapterTitle(dom);
    }

    findCoverImageUrl(dom) {
        // og:image is the most reliable
        let imgMeta = dom.querySelector("meta[property='og:image']");
        if (imgMeta) return imgMeta.getAttribute("content");
        return util.getFirstImgSrc(dom, "article, section, .novel-cover");
    }
}
