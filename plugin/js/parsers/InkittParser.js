"use strict";

parserFactory.register("inkitt.com", () => new InkittParser());

class InkittParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let chapters = this.chaptersFromPageData(dom);
        if (0 < chapters.length) {
            return chapters;
        }
        let menu = dom.querySelector("nav[aria-label=\"Contents\"], ul[role=\"listbox\"]");
        if (menu !== null) {
            return util.hyperlinksToChapterList(menu, link => link.href.includes("/chapters/"));
        }
        let storyMatch = dom.baseURI.match(/^(https?:\/\/[^/]+\/stories\/[^/?#]+)/);
        if (storyMatch && dom.baseURI.includes("/chapters/")) {
            let storyDom = (await HttpClient.wrapFetch(storyMatch[1])).responseXML;
            return this.getChapterUrls(storyDom);
        }
        return [];
    }

    // Chapter list is embedded in the Next.js payload, which may be split across several script tags
    chaptersFromPageData(dom) {
        let storyId = dom.baseURI.match(/\/stories\/(\d+)/)?.[1];
        if (storyId === undefined) {
            return [];
        }
        let payload = [...dom.querySelectorAll("script:not([src])")]
            .map(script => this.decodePayloadChunk(script.textContent))
            .join("");
        let entry = new RegExp("\"number\":(\\d+),\"name\":\"((?:[^\"\\\\]|\\\\.)*)\",\"original_name\":\"(?:[^\"\\\\]|\\\\.)*\",\"path\":\"(/stories/" + storyId + "/chapters/\\d+)\"", "g");
        let chapters = new Map();
        for (let match of payload.matchAll(entry)) {
            let sourceUrl = new URL(match[3], dom.baseURI).href;
            let number = this.chapterNumber(sourceUrl);
            if (!chapters.has(number)) {
                chapters.set(number, {
                    sourceUrl: sourceUrl,
                    title: match[1] + ". " + this.unescapeJsonString(match[2]).trim()
                });
            }
        }
        for (let link of dom.querySelectorAll("a[href*=\"/stories/" + storyId + "/chapters/\"]")) {
            let number = this.chapterNumber(link.href);
            if (!chapters.has(number)) {
                let name = link.textContent.replace(/\s+/g, " ").trim().replace(/^\d+\s+/, "");
                chapters.set(number, {sourceUrl: link.href, title: number + ". " + name});
            }
        }
        return [...chapters.values()].sort((a, b) => this.chapterNumber(a.sourceUrl) - this.chapterNumber(b.sourceUrl));
    }

    decodePayloadChunk(scriptText) {
        let arg = scriptText.match(/__next_f\.push\((\[[\s\S]*\])\)/)?.[1];
        try {
            let chunk = JSON.parse(arg)[1];
            return typeof chunk === "string" ? chunk : "";
        } catch {
            return "";
        }
    }

    unescapeJsonString(text) {
        try {
            return JSON.parse("\"" + text + "\"");
        } catch {
            return text;
        }
    }

    chapterNumber(url) {
        return Number(url.match(/\/chapters\/(\d+)/)?.[1] ?? 0);
    }

    findContent(dom) {
        return dom.querySelector("#chapterText, #story-text-container, article.default-style");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter-name, h2.chapter-head-title, #story-text-container > h2");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story-title, h1")
            ?? dom.title.replace(/ by .+ at Inkitt$/, "");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("meta[name=\"author\"], meta[property=\"author\"]")?.content?.trim()
            || [...dom.querySelectorAll("#storyAuthor, a.author-link")].map(e => e.textContent.trim()).find(text => text !== "")
            || dom.title.match(/ by (.+) at Inkitt$/)?.[1]?.trim();
        return author || super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("div.story-cover-wrapper[data-cover-url]")?.getAttribute("data-cover-url")
            ?? dom.querySelector("meta[property=\"og:image\"], meta[itemprop=\"image\"]")?.content
            ?? util.getFirstImgSrc(dom, "div.story-horizontal-cover");
    }

    extractDescription(dom) {
        return dom.querySelector("p.story-summary, p[data-quotable=\"summary\"]")?.textContent?.trim()
            ?? super.extractDescription(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("dd a[href*=\"/genres/\"]")];
        return 0 < genres.length
            ? genres.map(g => g.textContent.trim()).join(", ")
            : super.extractSubject(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button, .inline-comment-bubble, .comment-count");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.story-summary, p[data-quotable=\"summary\"]")];
    }
}
