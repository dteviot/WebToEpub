"use strict";
parserFactory.register("novelshub.org", () => new NovelshubParser());
class NovelshubParser extends Parser { 
    constructor() {
        super();
    }
    async getChapterUrls(dom, chapterUrlsUI) {
        // Scan for the base URL using the CSS selector
        let chaptersUrlElement = dom.querySelector("div.hidden > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > a:nth-child(1)");
        if (!chaptersUrlElement) {
            return [];
        }

        // Get the max chapter count from the CSS selector
        let maxChapterElement = dom.querySelector("div.relative:nth-child(2) > div:nth-child(1)");
        let maxChapters = 1000; // default fallback
        if (maxChapterElement) {
            let html = maxChapterElement.innerHTML;
            // Extract number from pattern like "Chapters ( 97 )"
            let match = html.match(/Chapters\s*\(\s*(\d+)\s*\)/i);
            if (match && match[1]) {
                let parsed = parseInt(match[1]);
                if (!isNaN(parsed)) {
                    maxChapters = parsed;
                }
            }
        }

        let baseUrl = chaptersUrlElement.href;
        let chapters = [];

        // Generate URLs incrementing the final number from 1 to maxChapters
        for (let i = 1; i <= maxChapters; i++) {
            // Replace the final number in the URL with the current iteration number
            let url = baseUrl.replace(/(\d+)(?!.*\d)/, i.toString());
            chapters.push({
                sourceUrl: url,
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
        return dom.querySelector("#react-aria7789978722-_r_1k4_-tabpanel-description > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > p:nth-child(1)").textContent.trim();
    }
    findChapterTitle(dom) {
        return dom.querySelector("div.p-6 > p:nth-child(2) > strong:nth-child(1)");
    }
    findCoverImageUrl(dom) {
        let imgElement = dom.querySelector("img.rounded-lg");
        if (imgElement && imgElement.src) {
            return imgElement.src;
        }
        return super.findCoverImageUrl(dom);
    }
}
