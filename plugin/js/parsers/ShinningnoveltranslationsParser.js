"use strict";

parserFactory.register("shinningnoveltranslations.com", function() { return new ShinningnoveltranslationsParser(); });

class ShinningnoveltranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let all = [...dom.querySelectorAll(".entry-content p")];
        let chapters = [];
        let isfree = false;
        for (let i = 0; i < all.length; i++) {
            if (all[i].textContent == "Free") {
                isfree = true;
            }
            let ret = all[i].firstChild;
            if (ret?.href?.includes("shinningnoveltranslations.com")) {
                chapters.push({
                    sourceUrl: ret.href, 
                    title: ret.textContent,
                    isIncludeable: isfree
                });
            }
        }
        return chapters.reverse();
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".wp-block-post-title")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".wp-block-image > img")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content")];
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    removeNextAndPreviousChapterHyperlinks(webPage, content) {
        util.removeElements(content.querySelectorAll(".wp-block-columns"));
        RoyalRoadParser.removeOlderChapterNavJunk(content);
    }
}