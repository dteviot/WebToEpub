"use strict";

parserFactory.register("global.novelpia.com", () => new GlobalNovelpiaParser());

class GlobalNovelpiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const rows = 9999;
        const sort = "ASC";
        const regex = /\/novel\/(\d+)/;
        const novelId = dom.baseURI.match(regex)?.[0].slice(7);
        const apiUrl = `https://api-global.novelpia.com/v1/novel/episode/cursor-list?novel_no=${novelId}&rows=${rows}&sort=${sort}`;
        try {
            const response = (await HttpClient.fetchJson(apiUrl)).json;
            const data = response.result.list;
            return data.map(chapter => {
                return {
                    sourceUrl: `https://global.novelpia.com/viewer/${chapter.episode_no}`,
                    title: chapter.epi_num + " - " + chapter.epi_title
                };
            });
        } catch (error) {
            ErrorLog.showErrorMessage(error);
        }
    }

    findContent(dom) {
        return dom.querySelector(".viewer-contents");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".nv-tit");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info-author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".nv-tag")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".synopsis-text").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".in-ch-txt");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover-box");
    }
    
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".next-epi-btn");
        super.removeUnwantedElementsFromContentElement(element);
    }

}
