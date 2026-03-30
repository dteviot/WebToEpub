"use strict";

parserFactory.register("readthedrama.com", () => new ReadthedramaParser());

/**
 * Parser for http://readthedrama.com/.
 */
class ReadthedramaParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    /**
     * @param { Document } dom 
     */
    async getChapterUrls(dom) {
        /** @type { NodeListOf<HTMLAnchorElement> } */
        const found = dom.querySelectorAll("div.divide-y a");

        return Array.from(found, anchor => {
            return {
                sourceUrl: anchor.href,
                title: anchor.querySelector("span:first-of-type").textContent.trim()
            };
        });
    }

    /**
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector("article.chapter-text");
    }

    /**
     * @param { Document } dom 
     */
    extractDescription(dom) {
        /** @type { HTMLMetaElement } */
        return dom.querySelector("meta[property='og:description']")?.content;
    }

    /**
     * @param { Document } dom 
     */
    extractSubject(dom) {
        /** @type { NodeListOf<HTMLDivElement> } */
        const tagContainers = dom.querySelectorAll("div.text-xs.border-none");

        return Array.from(tagContainers, container => container.innerHTML.trim()).join(", ");
    }

    /**
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        /** @type { HTMLParagraphElement } */
        const found = dom.querySelector("p.mb-2");

        return /\sby\s(.*)/.exec(found.textContent.trim())?.[1]?.trim();
    }

    /**
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        /** @type { HTMLMetaElement } */
        return dom.querySelector("meta[property='og:image']")?.content;
    }
}