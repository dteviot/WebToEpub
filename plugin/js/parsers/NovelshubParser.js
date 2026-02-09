"use strict";
parserFactory.register("novelshub.org", () => new NovelshubParser());
class NovelshubParser extends Parser { 
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.mt-4");
        let chapters = util.hyperlinksToChapterList(menu) || [];
        // Keep existing reversal behavior, then override titles with "Chapter X"
        let reversed = chapters.reverse();
        return reversed.map((ch, idx) => Object.assign({}, ch, { title: `Chapter ${idx + 1}` }));
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