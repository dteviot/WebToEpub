"use strict";

parserFactory.register("velvet-reverie.org", () => new VelvetReverieParser());

class VelvetReverieParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let table = dom.querySelector("div.story-toc ul");
        return util.hyperlinksToChapterList(table);
    }

    findContent(dom) {
        let temp = dom.querySelector("div.mbs_posts_text");
        let ToRemove = temp.querySelectorAll(".jum"); 
        for (let element of ToRemove) {
            element.remove();
        }
        return temp;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.story-info-column h1");
    }

    extractDescription(dom) {
        let temp = dom.querySelector("div.story-synopsis");
        let ToRemove = temp.querySelectorAll(".jum"); 
        for (let element of ToRemove) {
            element.remove();
        }
        return temp.textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.mbs_posts_title");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img.story-cover")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.story-synopsis p")];
    }
}
