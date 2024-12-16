"use strict";

parserFactory.register("mvlempyr.com", () => new MvlempyrParser());

class MvlempyrParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let imgLink = dom.querySelector("div.novel-image-wrapper img").src;
        let slug = imgLink.split("/").pop().split(".")[0];
        let chapterCount = parseInt(dom.querySelector("div#chapter-count").textContent);
        let chapterTitles = [...dom.querySelectorAll("div.chapter-item h3")].map((el) => el.textContent.replace(/^\d+\.\s*/, "")); 

        let chapterList = [];

        for (let i = 1; i <= chapterCount; i++) {
            let link = `https://www.mvlempyr.com/chapter/${slug}-${i}`;
            chapterList.push({
                sourceUrl: link,
                title: chapterTitles[i-1],
            });
        }
        return chapterList;
    }

    findContent(dom) {
        return (
            dom.querySelector("div#chapter") || dom.querySelector("#chapter-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.novelinfo .text-block-9");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("#span-28-164").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-image-wrapper");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsis")];
    }

}