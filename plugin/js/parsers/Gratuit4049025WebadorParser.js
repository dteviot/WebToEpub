"use strict";

parserFactory.register("gratuit-4049025.webador.com", () => new Gratuit4049025WebadorParser());

class Gratuit4049025WebadorParser extends Parser {
    constructor() {
        super();
    }

    /**
     * Content cache: Caches chapter content fetched when finding chapter URLs.
     *                Reduces fetches by literally 50%.
     * 
     * Hack:          The right way to do this would probably be to make a
     *                modification allowing `getChapterUrls` to pass `rawDom`.
     * 
     * Sketchy:       Because I don't know the codebase well enough to be
     *                certain this won't have side-effects.
     * 
     * @type { Map<string, Document> }
     * @private
     */
    sketchyHackContentCache = new Map();

    /**
     * @param { HTMLAnchorElement } anchor 
     * @private
     */
    getTitleFromAnchor(anchor) {
        return anchor.dataset["jwlinkTitle"] ?? anchor.title;
    }

    /**
     * @override
     * @param { Document } dom
     * @param { ChapterUrlsUI } chapterUrlsUI 
     */
    async getChapterUrls(dom, chapterUrlsUI) {
        /**
         * @param { HTMLAnchorElement } anchor
         * @param { Document } [dom]
         */
        const addChapter = (anchor, dom) => {
            /**
             * Some have the dataset tag, some have the title; seems basically
             * random.
             */
            let title = this.getTitleFromAnchor(anchor);

            if (util.isNullOrEmpty(title) || util.isNullOrEmpty(anchor.href))
                return;

            /**
             * Try to remove the story title abbreviation prefix, but just give
             * up if no match.
             */
            title = /[^-\u2013]*(?:-|\u2013)([^-\u2013]*(?:-|\u2013|:|"|“).*)/.exec(title)?.[1] ?? title;

            const href = util.resolveRelativeUrl(anchor.baseURI, anchor.href);

            /**
             * Have to check for duplicate titles because some chapters have
             * multiple different HREFs. And have to check for duplicate HREFs
             * because some "next" chapter links are incorrect **and** also have
             * a different title.
             */
            if (!allChapterLinks.find(link => link.sourceUrl === href || link.title === title)) {
                const link = {
                    sourceUrl: util.resolveRelativeUrl(anchor.baseURI, anchor.href),
                    title: title,
                };

                allChapterLinks.push(link);
                chapterUrlsUI.showTocProgress([link]);

                if (!dom)
                    return;

                this.sketchyHackContentCache.set(link.sourceUrl, dom);
            }
        };

        // Reset it, because paranoia.
        this.sketchyHackContentCache = new Map();

        /** @type { { sourceUrl: string, title: string, rawDom?: Document | undefined }[] } */
        const allChapterLinks = [];

        /**
         * Get the anchors which point to only the odd (1, 3, 5, ...) chapters.
         * 
         * @type { NodeListOf<HTMLAnchorElement> }
         */
        const oddChapterAnchors = dom.querySelectorAll("a[data-jwlink-type='page']");        

        for (const oddAnchor of oddChapterAnchors) {
            await this.rateLimitDelay();

            /** @type { Document } */
            const oddChapterDom = (await HttpClient.wrapFetch(oddAnchor.href)).responseXML;

            const nextUrl = URL.parse(oddAnchor.href);

            // Too many site inconsistencies to just not check or throw.
            if (!nextUrl)
                continue;

            const pathPrefix = /^\/[^/]*/.exec(nextUrl.pathname)?.[0];

            // Too many site inconsistencies to just not check or throw.
            if (!pathPrefix)
                continue;
            
            /**
             * This gets both the next and previous buttons; and potentially any
             * future additions. Has to be done because sometimes they are
             * swapped so it will fail to get a chapter link.
             * 
             * @type { NodeListOf<HTMLAnchorElement> }
             */
            const nextCandidates = oddChapterDom.querySelectorAll(`a[href*="${ pathPrefix }"]`);

            /**
             * Now smack them all together because sometimes we have to get the
             * chapter before `oddAnchor` from the previous button, because the
             * "next chapter" from the previous iteration was incorrect/missing.
             * 
             * And we have to do it here because we can't sort the full list
             * since all chapters don't have a uniform prefix to check against.
             * 
             * Ex.
             *    "Chapter 5"
             *    "ABBR - Chapter 5"
             *    "Extra 1"
             *    "Chapter"
             *    "Chapter Chapter 7"
             *    "Extra"
             */
            [oddAnchor, ...nextCandidates]
                .map(anchor => {
                    const foundNumber = this.getTitleFromAnchor(anchor).match(/([0-9]+(?:\.?[0-9]+)?)/g)?.[0];

                    return {
                        anchor: anchor,
                        estimatedNumber: foundNumber && parseInt(foundNumber) || Number.MAX_VALUE,
                    };
                })
                .sort((first, second) => first.estimatedNumber - second.estimatedNumber)
                .map(pair => pair.anchor)
                .forEach(anchor => addChapter(anchor, anchor.href === oddAnchor.href ? oddChapterDom : undefined));
        }

        return allChapterLinks;
    }

    /**
     * @override
     * @param { string } url 
     */
    async fetchChapter(url) {
        // If not cached proceed normally.
        if (!this.sketchyHackContentCache.has(url))
            return super.fetchChapter(url);

        /**
         * Delete the cached document after fetching to preserve normal
         * refetch/pack again behavior. If you clone it it would probably be
         * fine in theory; but I don't know the codebase well enough to make
         * that judgement for certain.
         */
        const dom = this.sketchyHackContentCache.get(url);
        this.sketchyHackContentCache.delete(url);

        return dom;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector("div[data-section-name='content'] .jw-strip__content > div:nth-of-type(2)");
    }

    /**
     * @override
     * @param { HTMLElement } content
     */
    removeUnwantedElementsFromContentElement(content) {
        /**
         * Again, not a single unique identifier in sight, so check the text
         * content instead...
         * 
         * @type { NodeListOf<HTMLParagraphElement> }
         */
        const candidates = content.querySelectorAll("p:has(em)");

        Array.from(candidates)
            .filter(e => /.*?(?:T|t)ranslator\s*:/.test(e.textContent))
            .forEach(unwanted => unwanted.remove());
    }

    /**
     * Get the main page container which houses everything we care about.
     * 
     * @param { Document } dom
     * @private
     */
    findToCPageContainer(dom) {
        return dom.querySelector("div[data-section-name='content'] .jw-strip__content:not(:has(.jw-element-ads))");
    }

    /**
     * Get the container which houses the cover image and meta info excluding
     * description.
     * 
     * @param { Document } dom
     * @private
     */
    findInfoContainer(dom) {
        return this.findToCPageContainer(dom)?.querySelector(":scope > :nth-child(1)");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        // Element type is inconsistent so assume the first one is the title...
        return this.findInfoContainer(dom)?.querySelector(".jw-element-imagetext-text > :nth-child(1)");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        /**
         * No unique identifiers and inconsistent ordering...
         * 
         * @type { NodeListOf<HTMLParagraphElement> }
         */
        const candidates = this.findInfoContainer(dom)
            ?.querySelectorAll(".jw-element-imagetext-text > p");

        return Array.from(candidates, p => /.*?(?:A|a)uthor\s*:(.*)/.exec(p.textContent.trim())?.[1])
            .find(author => !util.isNullOrEmpty(author))?.trim() ?? super.extractAuthor(dom);
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractSubject(dom) {
        /**
         * No unique identifiers and inconsistent ordering...
         * 
         * @type { NodeListOf<HTMLParagraphElement> }
         */
        const candidates = this.findInfoContainer(dom)
            ?.querySelectorAll(".jw-element-imagetext-text > p");

        return Array.from(candidates, p => /.*?(?:G|g)enre\s*:(.*)/.exec(p.textContent.trim())?.[1])
            .find(genres => !util.isNullOrEmpty(genres))?.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractLanguage(dom) {
        return dom.querySelector("html")?.getAttribute("lang");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractDescription(dom) {
        const container = this.findToCPageContainer(dom)
            ?.querySelector(":scope > :nth-of-type(2) .jw-element-imagetext-text");

        if (!container)
            return "";

        Array.from(container.querySelectorAll("p"))
            .filter(p => /.*?(D|d)escription\s*:/.test(p.textContent))
            .forEach(p => p.remove());

        return container.textContent.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        return this.findInfoContainer(dom)?.querySelector("img")?.src;
    }
}