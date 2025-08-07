"use strict";

parserFactory.register("mvlempyr.com", () => new MvlempyrParser());

class MvlempyrParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let imgLink = dom.querySelector("div.novel-image-wrapper img").src;
        let slug = imgLink.split("/").pop().split(".")[0];
        let chapterCount = parseInt(dom.querySelector("div#chapter-count").textContent)?parseInt(dom.querySelector("div#chapter-count").textContent):-1;
        let chapterTitles = [...dom.querySelectorAll("a.chapter-item h3")].map((el) => el.textContent.replace(/^\d+\.\s*/, ""));

        if (chapterCount == -1) {
            let regex = new RegExp("numberOfChapters.*?,");
            let regex2 = new RegExp("[0-9]+");
            let script = [...dom.scripts].map(a => a.outerHTML);
            chapterCount = parseInt(script.filter(a => a.match(regex))?.[0].match(regex)?.[0].match(regex2)?.[0]);
        }
        let chapterList = [];

        for (let i = 1; i <= chapterCount; i++) {
            let link = `https://www.mvlempyr.com/chapter/${slug}-${i}`;
            if (chapterTitles[i-1] == undefined) {
                chapterList.push({
                    sourceUrl: link,
                    title: "[placeholder]",
                });
            }
            else {
                chapterList.push({
                    sourceUrl: link,
                    title: chapterTitles[i-1],
                });
            }
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
        return dom.querySelector("#span-28-1305853").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-image-wrapper");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsis")];
    }
  
    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div.tagswrapper a")]);
        let regex = new RegExp("^#");
        return tags.map(e => e.textContent.trim().replace(regex, "")).join(", ");
    }
}
