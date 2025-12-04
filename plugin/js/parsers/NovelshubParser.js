"use strict";
parserFactory.register("novelshub.org", () => new NovelshubParser());
class NovelshubParser extends Parser { 
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterList = dom.querySelector("article section div[role='tabpanel']");
        if (!chapterList) {
            return [];
        }

        // Get the max chapter count from the CSS selector
        let maxChapter = chapterList.querySelectorAll("button.w-full")?.length;
        let baseUrl = dom.baseURI;
        let chapters = [];

        // Generate URLs incrementing the final number from 1 to maxChapters
        for (let i = 1; i <= maxChapter; i++) {
            chapters.push({
                sourceUrl: baseUrl + "/Chapter-" + i,
                title: `Chapter ${i}`
            });
        }

        return chapters;
    }
    findContent(dom) {
        return dom.querySelector("div.p-6");
    }
    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-2xl");
    }
    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.flex:nth-child(3) > div:nth-child(2) > p:nth-child(1)");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }
    extractDescription(dom) {
        var description = dom.querySelector("meta[name='description']")?.getAttribute("content");
        return description.trim();
    }
    findChapterTitle(dom) {
        return dom.querySelector("meta[property='og:title']")?.getAttribute("content");
    }
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article section");
    }
}