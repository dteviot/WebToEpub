"use strict";

parserFactory.register("noveldex.io", () => new NoveldexParser());

/**
 * Parser for the http://noveldex.io/ site.
 */
class NoveldexParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    /*
     * NOTE: As of 2026-03, it seems that classes and ids on this site can't be
     * trusted to remain stable. In a short timespan, over three separate
     * occurences, multiple classes and at least one id has been changed.
     */

    /**
     * Function for extracting a specific value from any of the schema/context
     * "scripts" in the main page dom.
     * 
     * @param { Document } dom Source to extract from.
     * @param { string } key The property to find (first found).
     * @returns { unknown | null } The found property, or null.
     * 
     * @private
     */
    extractFromContext(dom, key) {
        /** @type { NodeListOf<HTMLScriptElement> } */
        const contextContainers = dom.querySelectorAll("script[type='application/ld+json']");

        const property = Array.from(contextContainers, contextContainer => {
            let context = null;
            
            // Theoretically overkill but I have trust issues.
            try {
                context = JSON.parse(contextContainer.innerHTML);
            } catch (e) {} // eslint-disable-line no-empty

            return context?.[key] ?? null;
        }).find(property => property != null);

        return property;
    }

    /**
     * @param { Document } dom
     */
    async getChapterUrls(dom) {
        /**
         * SVG check excludes all locked chapters.
         * 
         * @type { NodeListOf<HTMLAnchorElement> }
         */
        const chapterLinksElements = dom.querySelectorAll("div[id] div[data-state] a[href*='chapter']:not(:has(svg.lucide-lock))");

        const chapterLinks = Array.from(chapterLinksElements, a => {
            /**
             * The separate the queries are needed because the first-of-type
             * doesn't work in an all selector when the spans are are nested.
             * 
             * @type { NodeListOf<HTMLSpanElement> }
             */
            const titleSpans = a.querySelector("div:first-of-type").querySelectorAll("span");

            return {
                sourceUrl: a.href,
                title: Array.from(titleSpans, span => span.innerText.trim()).join(" ")
            };
        });

        return chapterLinks;
    }

    /**
     * @param { Document } dom 
     */
    findContent(dom) {
        // Use query to narrow search down to raw script tag contents.
        const scripts = Array.from(dom.querySelectorAll("script:not([src])"), script => script.innerHTML);

        // Look for blocks of text enclosed by invisible characters.
        const mainRegex = /(?:[\uFEFF\u200B\u200C\u200D]+)(.+?)(?:[\uFEFF\u200B\u200C\u200D]+)/;

        let foundContent = null;
        for (const script of scripts) {
            const match = mainRegex.exec(script);
            if (match) {
                foundContent = match[1];
                break;
            }
        }

        // FIXME: Error out?
        if (!foundContent) return null;

        // Undo JSON escape.
        const unescaped = JSON.parse(`["${foundContent}"]`)[0];

        // Parse partially unescaped HTML.
        const elementified = dom.createElement("div");
        elementified.innerHTML = unescaped;

        // Unescape HTML-escaped tags, and remove nested <p> tags.
        Array.from(elementified.querySelectorAll("p"))
            .filter(p => p.innerText.startsWith("<p>"))
            .forEach(p => p.outerHTML = p.textContent);

        return elementified;
    }

    /**
     * @param { Document } dom
     */
    extractTitleImpl(dom) {
        /** @type { HTMLHeadingElement } */
        const storyTitle = dom.querySelector("main h1:first-of-type");
        
        return storyTitle;
    }

    /**
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        let author = this.extractFromContext(dom, "author");

        /*
         * Null-check is needed since typeof null is object for some
         * unfathomable reason.
         */
        author = author != null && typeof author === "object" && author?.["name"] || null;

        /*
         * Translator team's name is stored in a massive escaped JSON blob under
         * team -> name.
         */
        const translator = /(?:\\"team\\":.+?\\"name\\":\\")(.*?)(?:\\")/.exec(dom.body.innerHTML);

        const combined = [author, translator?.[1]].filter(s => s != null && s !== "").join(", ");

        return combined !== "" ? combined : super.extractAuthor(dom);
    }

    /**
     * @param { Document } dom 
     */
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    /**
     * @param { Document } dom
     */
    extractSubject(dom) {
        /**
         * @param { Document } dom
         */
        const extractGenres = (dom) => {
            const genres = this.extractFromContext(dom, "genre");

            if (!Array.isArray(genres)) return [];

            return genres.filter(property => typeof property === "string");
        };

        /**
         * @param { Document } dom 
         */
        const extractTags = (dom) => {
            /** @type { NodeListOf<HTMLAnchorElement> } */
            const tagAnchors = dom.querySelectorAll("a[href*='tag']");

            return Array.from(tagAnchors, anchor => anchor.innerText);
        };

        return extractGenres(dom).concat(extractTags(dom)).join(", ");
    }

    /**
     * @param { Document } dom 
     */
    extractDescription(dom) {
        const description = this.extractFromContext(dom, "description");

        return typeof description === "string" ? description : "";
    }

    /**
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        const url = this.extractFromContext(dom, "image");
        
        if (typeof url !== "string") return null;

        return url.startsWith("/") ? util.resolveRelativeUrl(dom.baseURI, url) : url;
    }
}
