"use strict";

parserFactory.register("chikari.moe", () => new ChikariParser());

class ChikariParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
        this.apiBase = "https://chikari.moe/api";
        this.pageSize = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        return dom.querySelector("a[href^='/authors/']")?.textContent.trim() ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.ring-border\\/50");
    }

    extractSlug(dom) {
        let match = dom.baseURI.match(/\/novels\/([^/?#]+)/);
        if (!match) {
            throw new Error("Unable to find novel slug in url.");
        }
        return match[1];
    }

    async fetchApiJson(path) {
        let response = await HttpClient.fetchJson(`${this.apiBase}${path}`);
        return response.json;
    }

    async getChapterUrls(dom) {
        let slug = this.extractSlug(dom);
        let allChapters = [];
        let offset = 0;
        let total = Infinity;

        while (offset < total) {
            let page = await this.fetchApiJson(
                `/novels/${slug}/chapters?order=desc&limit=${this.pageSize}&offset=${offset}`
            );
            total = page.total;
            allChapters.push(...page.items);
            offset += this.pageSize;
        }

        return allChapters
            .reverse()
            .map((chapter) => ({
                sourceUrl: `https://chikari.moe/novels/${slug}/chapter/${chapter.number}`,
                title: chapter.title
            }));
    }

    extractChapterInfo(url) {
        let match = url.match(/\/novels\/([^/]+)\/chapter\/([^/?#]+)/);
        if (!match) {
            throw new Error("Unable to find chapter info in " + url);
        }
        return { slug: match[1], number: match[2] };
    }

    async fetchChapter(url) {
        let { slug, number } = this.extractChapterInfo(url);
        let chapterData = await this.fetchApiJson(`/novels/${slug}/chapters/${number}/read`);
        if (!chapterData?.body) {
            throw new Error("Unexpected chapter response for " + url);
        }

        let newDoc = Parser.makeEmptyDocForContent(url);
        Parser.addTextToChapterContent(newDoc, chapterData.body);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }
}