"use strict";

parserFactory.register("lunoxscans.com", () => new LunoxscansParser());

/**
 * Parser for http://lunoxscans.com/.
 */
class LunoxscansParser extends MadaraParser {
    /**
     * @param { Document } dom 
     */
    async getChapterUrls(dom) {
        /** @type { NodeListOf<HTMLAnchorElement> } */
        const found = dom.querySelectorAll("a.lunox-chapter-item:not(:has(svg.lunox-chapter-lock))");

        return Array.from(found, anchor => {
            return {
                sourceUrl: anchor.href,
                title: anchor.querySelector(".lunox-chapter-name").textContent.trim()
            };
        }).reverse();
    }

    /**
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        return dom.querySelector(".post-title");
    }
}