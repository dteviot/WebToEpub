"use strict";
// Ai generated
// Generic parser for every novel on Curspe.
parserFactory.register("curspe.com", () => new CurspeParser());

class CurspeParser extends Parser {
    constructor() {
        super();
        this.novelPath = null;
        this.novelSlug = null;
    }

    getNovelPath(dom) {
        const url = new URL(dom.baseURI);
        const match = url.pathname.match(/^\/novels\/([^/]+)\/?$/i);
        if (match == null) {
            return null;
        }
        this.novelSlug = match[1];
        return `/novels/${match[1]}/`;
    }

    async getChapterUrls(dom) {
        this.novelPath = this.getNovelPath(dom);
        if (this.novelPath == null) {
            return [];
        }
        const chapters = new Map();
        for (const link of dom.querySelectorAll("a[href]")) {
            const chapter = this.cleanChapterUrl(link.href);
            if (chapter == null) {
                continue;
            }
            let title = this.cleanChapterTitle(link.textContent, chapter.number);
            // The chapter list sometimes uses only "Start Reading" or
            // "Chapter N". Fetch the chapter page first so punctuation and
            // special suffixes such as "(Final Chapter)" are not lost.
            if (!this.isUsableChapterTitle(title)) {
                title = await this.getChapterTitleFromPage(chapter.url);
            }
            if (!this.isUsableChapterTitle(title)) {
                title = this.titleFromChapterUrl(chapter.url, chapter.number);
            }
            // Always include the chapter number. Curspe's current list often
            // omits "Chapter N -" from the visible link text, while one or
            // more entries may still contain it.
            title = this.formatChapterTitle(chapter.number, title);
            chapters.set(chapter.number, {
                sourceUrl: chapter.url,
                title: title
            });
        }

        return [...chapters.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, chapter]) => chapter);
    }

    cleanChapterUrl(href) {
        if (this.novelPath == null) {
            return null;
        }
        try {
            const url = new URL(href, document.baseURI);
            if (url.hostname.replace(/^www\./i, "").toLowerCase() !== "curspe.com") {
                return null;
            }

            const pathname = url.pathname.replace(/\/+/g, "/");
            if (!pathname.toLowerCase().startsWith(this.novelPath.toLowerCase())) {
                return null;
            }

            const relativePath = pathname.substring(this.novelPath.length);
            const match = relativePath.match(/^chapter-(\d+)(?:-([^/]+))?\/?$/i);
            if (match == null) {
                return null;
            }

            const number = Number.parseInt(match[1], 10);
            if (!Number.isFinite(number)) {
                return null;
            }
            // Keep the complete canonical chapter slug, but remove query
            // strings, fragments, duplicate slashes and trailing junk.
            const slug = match[2] ? `-${match[2]}` : "";
            url.pathname = `${this.novelPath}chapter-${number}${slug}/`;
            url.search = "";
            url.hash = "";

            return {
                number: number,
                url: url.href
            };
        }
        catch (e) {
            return null;
        }
    }

    cleanChapterTitle(text, chapterNumber) {
        const clean = (text || "")
            .replace(/\s+/g, " ")
            .trim();
        if (!clean || /^start\s+reading$/i.test(clean)) {
            return "";
        }
        const withoutMeta = this.removeChapterListMetadata(clean);
        // eslint-disable-next-line
        const prefix = new RegExp(`^Chapter\s+${chapterNumber}\s*[-–—:]\s*(.+)$`, "i");
        const match = withoutMeta.match(prefix);
        if (match != null) {
            return match[1].trim();
        }
        // eslint-disable-next-line
        if (new RegExp(`^Chapter\s+${chapterNumber}$`, "i").test(withoutMeta)) {
            return "";
        }
        // Curspe can expose bad/generated link text such as
        // "From Chapter 774". Treat it as missing and fetch the real title.
        if (/^from\s+chapter\s+\d+$/i.test(withoutMeta)
            || /^chapter\s+\d+\s+from\s+chapter\s+\d+$/i.test(withoutMeta)) {
            return "";
        }
        return withoutMeta;
    }

    removeChapterListMetadata(text) {
        return (text || "")
            .replace(/\s*\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b.*$/i, "")
            .replace(/\s*[•·]\s*[\d,]+\s+words?\s*$/i, "")
            .trim();
    }

    isUsableChapterTitle(title) {
        return Boolean(title && !/^Chapter\s+\d+$/i.test(title.trim()));
    }

    async getChapterTitleFromPage(url) {
        try {
            const response = await HttpClient.wrapFetch(url);
            const chapterDom = response.responseXML;
            const content = chapterDom?.querySelector("div.chapter-content");
            // The title is inside div.chapter-content. Prefer a heading, then
            // fall back to the page title if the site's heading markup changes.
            const heading = content?.querySelector("h1, h2, h3, h4, h5, h6");
            let title = heading?.textContent?.replace(/\s+/g, " ").trim();
            if (!title) {
                title = chapterDom?.title?.replace(/\s+/g, " ").trim();
            }
            if (!title) {
                return "";
            }
            title = title
                .replace(/\s*[–—-]\s*Curspe\s*$/i, "")
                .replace(/\s*\|\s*Curspe\s*$/i, "")
                .trim();

            const match = title.match(/^Chapter\s+\d+\s*[-–—:]\s*(.+)$/i);
            return match ? match[1].trim() : title.replace(/^Chapter\s+\d+\s*$/i, "").trim();
        }
        catch (e) {
            return "";
        }
    }

    formatChapterTitle(number, title) {
        const clean = (title || "").replace(/^Chapter\s+\d+\s*[-–—:]?\s*/i, "").trim();
        return clean ? `Chapter ${number} - ${clean}` : `Chapter ${number}`;
    }

    titleFromChapterUrl(url, chapterNumber) {
        try {
            const pathname = new URL(url).pathname;
            const match = pathname.match(/\/chapter-\d+-([^/]+)\/?$/i);
            if (match == null) {
                return `Chapter ${chapterNumber}`;
            }
            let value = decodeURIComponent(match[1])
                .replace(/[-_]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, character => character.toUpperCase());
            // Preserve Curspe's completed-chapter suffix when the chapter
            // page itself cannot be fetched for its exact displayed title.
            if (/\s+final\s+chapter$/i.test(value)) {
                value = value.replace(/\s+final\s+chapter$/i, "") + "! (Final Chapter)";
            }
            return value;
        }
        catch (e) {
            return `Chapter ${chapterNumber}`;
        }
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }
    // No findChapterTitle(): the chapter title is already inside
    // div.chapter-content and must not be inserted a second time.
    extractTitleImpl(dom) {
        // Curspe's og:title can incorrectly be the site name "Curspe".
        // Prefer the actual novel heading and document title first.
        const candidates = [
            ...[...dom.querySelectorAll("h1")].map(e => e.textContent),
            dom.title,
            dom.querySelector("meta[property='og:title']")?.getAttribute("content")
        ];
        for (const candidate of candidates) {
            const title = this.cleanNovelTitle(candidate);
            if (title) {
                return title;
            }
        }
        // Last-resort fallback: derive a readable title from /novels/<slug>/.
        return this.titleFromNovelSlug(dom) || "Curspe";
    }

    cleanNovelTitle(value) {
        let title = (value || "").replace(/\s+/g, " ").trim();
        if (!title) {
            return "";
        }
        title = title
            .replace(/\s*[–—-]\s*Curspe\s*$/i, "")
            .replace(/\s*\|\s*Curspe\s*$/i, "")
            .trim();

        if (/^curspe$/i.test(title)) {
            return "";
        }
        // Chapter-page titles are not novel titles.
        if (/^chapter\s+\d+\b/i.test(title)) {
            return "";
        }
        return title;
    }

    titleFromNovelSlug(dom) {
        try {
            const url = new URL(dom.baseURI);
            const match = url.pathname.match(/^\/novels\/([^/]+)\/?$/i);
            if (!match) {
                return "";
            }
            return decodeURIComponent(match[1])
                .replace(/[-_]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, c => c.toUpperCase());
        }
        catch (e) {
            return "";
        }
    }

    extractAuthor(dom) {
        const metaAuthor = dom.querySelector(
            "meta[name='author'], meta[property='book:author'], meta[name='og:book:author']"
        )?.getAttribute("content");
        if (metaAuthor?.trim()) {
            return metaAuthor.trim();
        }
        const jsonAuthor = this.getJsonLdAuthor(dom);
        if (jsonAuthor) {
            return jsonAuthor;
        }
        return this.getLabeledNovelValue(dom, /^Author$/i) || super.extractAuthor(dom);
    }

    getJsonLdAuthor(dom) {
        for (const script of dom.querySelectorAll("script[type='application/ld+json']")) {
            try {
                const data = JSON.parse(script.textContent);
                const objects = Array.isArray(data) ? data : [data];
                for (const object of objects) {
                    const author = object?.author;
                    if (typeof author === "string" && author.trim()) {
                        return author.trim();
                    }
                    if (author?.name?.trim()) {
                        return author.name.trim();
                    }
                    if (Array.isArray(author)) {
                        const names = author
                            .map(a => typeof a === "string" ? a : a?.name)
                            .filter(Boolean);
                        if (names.length) {
                            return names.join(", ");
                        }
                    }
                }
            }
            catch (e) {
                // Ignore malformed JSON-LD.
            }
        }
        return "";
    }

    extractSubject(dom) {
        const genres = [];
        for (const link of dom.querySelectorAll("a[href*='genre'], a[href*='genres']")) {
            const text = link.textContent.replace(/\s+/g, " ").trim();
            if (text && !/^genres?$/i.test(text) && !genres.includes(text)) {
                genres.push(text);
            }
        }
        if (genres.length === 0) {
            const heading = [...dom.querySelectorAll("h1, h2, h3, h4, h5, strong, b")]
                .find(element => /^Genres$/i.test(element.textContent.trim()));
            if (heading) {
                let parent = heading.parentElement;
                for (let depth = 0; parent && depth < 4 && genres.length === 0; depth++, parent = parent.parentElement) {
                    for (const link of parent.querySelectorAll("a[href]")) {
                        const text = link.textContent.replace(/\s+/g, " ").trim();
                        if (text && !/^genres?$/i.test(text) && !genres.includes(text)) {
                            genres.push(text);
                        }
                    }
                }
            }
        }
        return [...new Set(genres)].join(", ");
    }

    extractDescription(dom) {
        // Prefer Curspe's visible synopsis: its meta description can omit
        // the opening System messages and other synopsis paragraphs.
        const visible = this.extractVisibleSynopsis(dom);
        if (visible) {
            return visible;
        }
        const meta = dom.querySelector(
            "meta[name='description'], meta[property='og:description']"
        )?.getAttribute("content");
        if (meta?.trim()) {
            return this.cleanDescription(meta);
        }
        const direct = dom.querySelector(
            "[itemprop='description'], .novel-description, .book-description, .series-description, .novel-summary, .summary, .synopsis"
        );
        if (direct?.textContent?.trim()) {
            return this.cleanDescription(direct.textContent);
        }
        return "";
    }

    extractVisibleSynopsis(dom) {
        const novelHeading = this.findNovelHeading(dom);
        if (!novelHeading) {
            return "";
        }
        const stopRegex = /^(?:see\s+more|chapters?(?:\s|$)|reviews?(?:\s|$)|premium\b)/i;
        const blocks = [];
        const seen = new Set();
        const stopMarker = [...dom.querySelectorAll("h1, h2, h3, h4, h5, h6, button, a, strong, b")].find(
            element => stopRegex.test(element.textContent.replace(/\s+/g, " ").trim())
        );
        for (const element of dom.querySelectorAll("p, blockquote, section, article, div, li")) {
            if (!(novelHeading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                continue;
            }
            if (element.closest(".chapter-content, nav, footer, .chapter-list, .chapters")) {
                continue;
            }
            if (stopMarker && (stopMarker === element || (stopMarker.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))) {
                continue;
            }

            const text = element.textContent.replace(/\s+/g, " ").trim();
            if (!text || stopRegex.test(text) || this.isMetadataText(text)) {
                continue;
            }
            // Keep leaf-ish blocks so parent containers do not duplicate all
            // of their child synopsis text.
            const hasBlockDescendant = [...element.children].some(child =>
                /^(P|BLOCKQUOTE|SECTION|ARTICLE|DIV|LI)$/.test(child.tagName)
            );
            if (hasBlockDescendant) {
                continue;
            }
            if (!seen.has(text) && text.length >= 20) {
                seen.add(text);
                blocks.push(text);
            }
        }

        return this.cleanDescription(blocks.join("\n\n"));
    }

    findNovelHeading(dom) {
        const title = this.cleanNovelTitle(dom.title) || this.titleFromNovelSlug(dom);
        const headings = [...dom.querySelectorAll("h1, h2")];
        return headings.find(h => {
            const text = h.textContent.replace(/\s+/g, " ").trim();
            return text && (text === title || !/^curspe$/i.test(text));
        }) || null;
    }

    isMetadataText(text) {
        return /^(?:author|origin|status|published|genres?|chapters?|search chapters|premium|bookmark)\b/i.test(text)
            || /^(?:\d+[\d,]*\s+chapters?)$/i.test(text);
    }

    cleanDescription(text) {
        return (text || "")
            .replace(/\\r?\\n/g, "\n")
            .replace(/\r\n?/g, "\n")
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .join("\n\n")
            .trim();
    }

    findCoverImageUrl(dom) {
        const images = [...dom.querySelectorAll("img[src], img[data-src], img[data-lazy-src], source[srcset]")];
        const candidates = [];

        for (const element of images) {
            const src = this.getImageUrl(element);
            if (!src) {
                continue;
            }
            const text = [
                element.getAttribute("alt"),
                element.getAttribute("title"),
                element.className,
                element.parentElement?.className,
                src
            ].filter(Boolean).join(" ").toLowerCase();
            if (/logo|favicon|avatar|icon|emoji|gravatar|cropped-crop/i.test(text)) {
                continue;
            }
            if (element.closest("div.chapter-content")) {
                continue;
            }
            let score = 0;
            if (/cover|thumbnail|book|novel|series|featured/i.test(text)) score += 8;
            if (/wp-content\/uploads/i.test(src)) score += 4;
            if (/-scaled\.(?:jpe?g|png|webp)$/i.test(src)) score += 3;
            if (/\b(?:300|400|500|600|800|1000|1200)\b/.test(src)) score += 1;
            candidates.push({src, score});
        }

        candidates.sort((a, b) => b.score - a.score);
        if (candidates.length) {
            return candidates[0].src;
        }
        // Metadata is a final fallback. It is deliberately after visible
        // cover images because Curspe's og:image can be a generic thumbnail.
        const meta = dom.querySelector(
            "meta[property='og:image'], meta[name='twitter:image'], meta[itemprop='image'], link[rel='image_src']"
        );
        const content = meta?.getAttribute("content") || meta?.getAttribute("href");
        return content ? new URL(content, dom.baseURI).href : null;
    }

    getImageUrl(element) {
        let src = element.getAttribute("src")
            || element.getAttribute("data-src")
            || element.getAttribute("data-lazy-src");
        if (!src && element.getAttribute("srcset")) {
            src = element.getAttribute("srcset").split(",")[0].trim().split(/\s+/)[0];
        }
        if (!src) {
            return null;
        }
        try {
            return new URL(src, document.baseURI).href;
        }
        catch (e) {
            return null;
        }
    }

    getLabeledNovelValue(dom, labelRegex) {
        // Curspe renders metadata as a label followed by a value, sometimes
        // without a colon. Do not depend on one exact row structure.
        const labelSource = labelRegex.source
            .replace(/^\^/, "")
            .replace(/\$$/, "");
        const labelOnly = new RegExp(`^${labelSource}$`, "i");
        // eslint-disable-next-line
        const inline = new RegExp(`^${labelSource}\s*[:：]?\s*(.+)$`, "i");

        for (const element of dom.querySelectorAll("li, p, div, dt, dd, span, strong, b")) {
            const text = element.textContent.replace(/\s+/g, " ").trim();
            if (!text) {
                continue;
            }
            const match = text.match(inline);
            if (match?.[1]?.trim() && !labelOnly.test(match[1].trim())) {
                return match[1].trim();
            }
            if (labelOnly.test(text)) {
                let sibling = element.nextElementSibling;
                while (sibling) {
                    const value = sibling.textContent.replace(/\s+/g, " ").trim();
                    if (value && !labelOnly.test(value)) {
                        return value;
                    }
                    sibling = sibling.nextElementSibling;
                }
                const parent = element.parentElement;
                if (parent) {
                    const parts = [...parent.children]
                        .map(child => child.textContent.replace(/\s+/g, " ").trim())
                        .filter(Boolean);
                    const index = parts.findIndex(part => labelOnly.test(part));
                    if (index >= 0 && parts[index + 1]) {
                        return parts[index + 1];
                    }
                }
            }
        }
        return "";
    }
}
