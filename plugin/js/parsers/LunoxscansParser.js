"use strict";

parserFactory.register("lunoxscans.com", () => new LunoxscansParser());

/**
 * Parser for http://lunoxscans.com/.
 */
class LunoxscansParser extends MadaraParser {
    /**
     * @override
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
     * @override
     * @param { HTMLElement } dom 
     */
    removeUnwantedElementsFromContentElement(dom) {
        /** @type { NodeListOf<HTMLSpanElement> } */
        const suspects = dom.querySelectorAll("p:first-of-type, p:last-of-type");
        
        [...suspects]
            .filter(suspect => suspect.textContent.includes("Lunox"))
            .forEach(suspect => suspect.remove());
        super.removeUnwantedElementsFromContentElement(dom);
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        return dom.querySelector(".post-title");
    }
}