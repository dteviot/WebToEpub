"use strict";

parserFactory.register("novelhub.net", () => new NovelhubParser());

class NovelhubParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        // If the starting URL is the novel main page, we need to switch to the chapters page.
        // e.g. https://novelhub.net/novel/starting-with-sss-rank-i-get-a-new-skill-every-livestream
        let chaptersUrl = dom.baseURI;
        if (!chaptersUrl.includes("/chapters")) {
            chaptersUrl = chaptersUrl.replace(/\/+$/, "") + "/chapters?sort=asc&page=1";
            let response = await HttpClient.wrapFetch(chaptersUrl);
            dom = response.responseXML;
        }
        
        return (await this.walkTocPages(dom, 
            NovelhubParser.chaptersFromDom, 
            NovelhubParser.nextTocPageUrl, 
            chapterUrlsUI
        ));
    }

    static chaptersFromDom(dom) {
        let chapters = [];
        let links = dom.querySelectorAll("a[href*='/chapter-']");
        for (let a of links) {
            // NovelHub chapter links look like: .../chapter-1, .../chapter-2
            // They have a div with text-sm font-medium containing the title
            let titleEl = a.querySelector("h3") || a;
            let title = titleEl.textContent.trim();
            if(title === "--") {
                // If title is hidden/empty, try to get chapter number
                let numEl = a.querySelector("span.text-sm.font-medium");
                if (numEl) {
                    title = "Chapter " + numEl.textContent.trim();
                }
            }
            chapters.push({
                url: util.resolveRelativeUrl(dom.baseURI, a.href),
                title: title
            });
        }
        // Links on the page might be duplicated (e.g. mobile vs desktop views) or they might just be a simple list.
        // Let's filter out duplicates by URL.
        let uniqueChapters = [];
        let seenUrls = new Set();
        for (let c of chapters) {
            if (!seenUrls.has(c.url)) {
                seenUrls.add(c.url);
                uniqueChapters.push(c);
            }
        }
        return uniqueChapters;
    }

    static nextTocPageUrl(dom) {
        // Look for the "Next" pagination link
        let nextLink = dom.querySelector("a[rel='next']");
        if (nextLink) {
            return util.resolveRelativeUrl(dom.baseURI, nextLink.href);
        }
        return null;
    }

    findContent(dom) {
        return dom.querySelector("article#chapter-content");
    }

    extractTitleImpl(dom) {
        let h1 = dom.querySelector("h1");
        if (h1) return h1.textContent.trim();
        let ogTitle = dom.querySelector("meta[property='og:title']");
        if (ogTitle) return ogTitle.getAttribute("content").replace("Read ", "").replace(" Online Free | NovelHub", "");
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let authorMeta = dom.querySelector("meta[name='author']") || dom.querySelector("meta[property='book:author']");
        if (authorMeta) {
            return authorMeta.getAttribute("content");
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let descMeta = dom.querySelector("meta[property='og:description']") || dom.querySelector("meta[name='description']");
        if (descMeta) {
            return descMeta.getAttribute("content");
        }
        return super.extractDescription(dom);
    }

    findChapterTitle(dom) {
        let titleMeta = dom.querySelector("meta[name='chapter-title']");
        if (titleMeta) {
            return titleMeta.getAttribute("content");
        }
        let h4 = dom.querySelector("article#chapter-content h4");
        if (h4) {
            return h4.textContent.trim();
        }
        return super.findChapterTitle(dom);
    }

    findCoverImageUrl(dom) {
        let imgMeta = dom.querySelector("meta[property='og:image']");
        if (imgMeta) {
            return imgMeta.getAttribute("content");
        }
        return util.getFirstImgSrc(dom, "article section");
    }
}
