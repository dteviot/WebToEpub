"use strict";

parserFactory.register("novelfrance.fr", () => new NovelfranceParser());

class NovelfranceParser extends Parser {
    constructor() {
        super();
    }

    /**
     * @override
     * @param { Document } dom 
     * @param { ChapterUrlsUI } chapterUrlsUI 
     */
    async getChapterUrls(dom, chapterUrlsUI) {
        const name = /\/(?<name>[^/]+)\/?(?:\?|$)/.exec(dom.baseURI)?.groups?.["name"];

        if (!name)
            return null;

        /** @type { { sourceUrl: string, title: string }[] } */
        const found = [];

        let hasMore = true;
        let current = 0;

        while (hasMore) {
            await this.rateLimitDelay();

            const partial = (await HttpClient.fetchJson(
                // Take is arbitrary large number as API limits it.
                `https://novelfrance.fr/api/chapters/${ name }?skip=${ current }&take=69420`
            )).json;

            hasMore = partial["hasMore"];
            current = partial["skip"] + partial["take"];

            found.push(...partial.chapters.map(chapter => ({
                sourceUrl: `https://novelfrance.fr/novel/${ name }/${ chapter["slug"] }`,
                title: `Chapitre ${ chapter["chapterNumber"] }: ${ chapter["title"] }`
            })));

            chapterUrlsUI.showTocProgress(found);
        }

        return found;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findChapterTitle(dom) {
        const container = dom.querySelector("article:has(.chapter-content) > header")?.children;

        if (!container)
            return null;
        
        return Array.from(container, node => node.textContent).join(": ");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        return dom.querySelector("meta[property='og:title']")
            ?.content?.replace(/\s*\|\s*NovelFrance\s*$/, "")?.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        /** @type { HTMLMetaElement | null } */
        return dom.querySelector("meta[name='og:book:author']")?.content
            ?? super.extractAuthor();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractSubject(dom) {
        return dom.querySelector("meta[name='og:book:tag']")?.content;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractDescription(dom) {
        return dom.querySelector("meta[property='og:description']")?.content;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.content;
    }
}