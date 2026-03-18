
"use strict";

class GrandOldBooksParser extends Parser {
    constructor() {
        super(new ImageCollector());
        this._meta          = null;
        this._catalogAuthor = null;
        this._coverImageUrl = null;
    }

    async getChapterUrls(dom) {
        const slug = this._slugFromUrl(dom.baseURI);
        if (!slug) throw new Error("Cannot extract book slug: " + dom.baseURI);
        const BASE = "https://grandoldbooks.com";
        const OPTS = { credentials: "include" };

        // Primary: offline API
        try {
            const r = await fetch(`${BASE}/api/offline/books/${slug}`, OPTS);
            if (r.ok) {
                const p = await r.json();
                this._meta = p;
                if (p.coverImage) this._coverImageUrl =
                    p.coverImage.startsWith("http") ? p.coverImage : BASE + p.coverImage;
                this._updateUIAsync();
                return p.chapters.map(ch => ({
                    sourceUrl: this._chapterUrl(slug, ch),
                    title: ch.title,
                }));
            }
        } catch (e) { return null; }

        // Fallback: meta.json + catalog.json
        try {
            const r = await fetch(`${BASE}/data/books/${slug}/meta.json`, OPTS);
            if (r.ok) {
                const m = await r.json();
                this._meta = m;
                if (m.coverImage) this._coverImageUrl =
                    m.coverImage.startsWith("http") ? m.coverImage : BASE + m.coverImage;
                try {
                    const cr = await fetch(`${BASE}/data/catalog.json`, OPTS);
                    if (cr.ok) {
                        const cat = await cr.json();
                        const a = (cat.authors ?? []).find(x => x.id === m.authorId);
                        if (a?.name) this._catalogAuthor = a.name;
                    }
                } catch (e) { return null; }
                this._updateUIAsync(); // ← update UI AFTER fetches complete
                return await this._stubUrls(slug, m.totalChapters ?? 1, BASE);
            }
        } catch (e) { return null; }

        const ndc = this._ndcChapters(dom);
        if (ndc?.length)
            return ndc.map(ch => ({ sourceUrl: this._chapterUrl(slug, ch), title: ch.title }));
        throw new Error("Could not get chapters for " + slug);
    }

    // Called after async fetches — overwrites whatever populateUI set earlier
    _updateUIAsync() {
        const author = this._meta?.authorName ?? this._catalogAuthor;
        // Full summary (not truncated OG)
        const desc   = this._meta?.summary;
        const genre  = Array.isArray(this._meta?.genre) ? this._meta.genre.join(", ") : null;
        const cover  = this._coverImageUrl;

        // Label-based (find input by associated label text)
        document.querySelectorAll("label").forEach(label => {
            const text = label.textContent.trim().toLowerCase();
            const el   = label.htmlFor
                ? document.getElementById(label.htmlFor)
                : label.querySelector("input, textarea");
            if (!el) return;
            if (author && (text.includes("author")))
                el.value = author;
            if (desc && (text.includes("description") || text.includes("synopsis")))
                el.value = desc;
            if (genre && (text.includes("tag") || text.includes("subject") || text.includes("genre")))
                el.value = genre;
            if (cover && text.includes("cover"))
                el.value = cover;
        });

        // Known IDs fallback
        const set = (id, val) => { if (!val) return; const e = document.getElementById(id); if (e) e.value = val; };
        set("authorInput",      author);
        set("epubAuthor",       author);
        set("descriptionInput", desc);
        set("epubDescription",  desc);
        set("tagsInput",        genre);
        set("subjectInput",     genre);
        set("coverUrl",         cover);
        set("coverImageUrl",    cover);
    }

    // Sync populateUI — sets what it can from the DOM immediately
    populateUI(dom) {
        super.populateUI(dom);

        const author = dom?.querySelector?.("meta[name=\"author\"]")?.getAttribute?.("content");
        const ogDesc = dom?.querySelector?.("meta[property=\"og:description\"]")?.getAttribute?.("content");
        const ogImg  = dom?.querySelector?.("meta[property=\"og:image\"]")?.getAttribute?.("content");
        if (!this._coverImageUrl && ogImg) this._coverImageUrl = ogImg;

        document.querySelectorAll("label").forEach(label => {
            const text = label.textContent.trim().toLowerCase();
            const el   = label.htmlFor
                ? document.getElementById(label.htmlFor)
                : label.querySelector("input, textarea");
            if (!el) return;
            // Override <unknown> default for author
            if (author && text.includes("author") && (!el.value || el.value === "<unknown>"))
                el.value = author;
            if (ogDesc && (text.includes("description") || text.includes("synopsis")) && !el.value)
                el.value = ogDesc;
            if (ogImg && text.includes("cover") && !el.value)
                el.value = ogImg;
        });

        const setIfEmpty = (id, val) => {
            if (!val) return;
            const e = document.getElementById(id);
            if (e && (!e.value || e.value === "<unknown>")) e.value = val;
        };
        setIfEmpty("authorInput",   author);
        setIfEmpty("epubAuthor",    author);
        setIfEmpty("coverUrl",      ogImg);
        setIfEmpty("coverImageUrl", ogImg);
    }

    findContent(dom) { return dom.querySelector(".min-h-screen"); }

    extractTitleImpl(dom) {
        return dom.querySelector("h1")?.textContent?.trim() ?? null;
    }

    extractAuthor(dom) {
        return dom?.querySelector?.("meta[name=\"author\"]")?.getAttribute?.("content")
            ?? this._meta?.authorName ?? this._catalogAuthor
            ?? super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const text = this._meta?.summary ??
            dom?.querySelector?.("meta[property=\"og:description\"]")?.getAttribute?.("content");
        if (!text) return [];
        const p = document.createElement("p");
        p.textContent = text;
        return [p.outerHTML];
    }

    extractSubject(dom) {
        const genre = this._meta?.genre;
        if (Array.isArray(genre) && genre.length) return genre.join(", ");
        return super.extractSubject?.(dom) ?? "";
    }

    findCoverImageUrl(dom) {
        if (this._coverImageUrl) return this._coverImageUrl;
        const og = dom?.querySelector?.("meta[property=\"og:image\"]")?.getAttribute?.("content");
        if (og) return og;
        const slug = this._slugFromUrl(dom?.baseURI);
        return slug ? `https://grandoldbooks.com/data/images/covers/${slug}.webp` : null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            ".z-30, .z-50, .backdrop-blur-xl, .text-xs, .flex.items-center, h3, [class*='audio'], [class*='gate']"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    _slugFromUrl(url) {
        const m = (url ?? "").match(/grandoldbooks\.com\/(?:books|read)\/([^/?#]+)/);
        return m ? m[1] : null;
    }

    _ndcChapters(dom) {
        try {
            const s = dom.querySelector("#__NEXT_DATA__");
            const pp = JSON.parse(s?.textContent ?? "null")?.props?.pageProps;
            return pp?.readerPayload?.chapters ?? pp?.chapters ?? null;
        } catch (e) { return null; }
    }

    _chapterUrl(bookSlug, ch) {
        const base     = "https://grandoldbooks.com/read/" + bookSlug;
        const partNum  = ch.part ?? 1;
        const partSlug = this._toSlug(ch.partName ?? "part-" + partNum);
        const chapSlug = this._toSlug(ch.slugTitle ?? ch.title);
        return `${base}/${partNum}/${partSlug}/${ch.number}/${chapSlug}`;
    }

    _toSlug(s) {
        return (s ?? "").toLowerCase()
            .replace(/['']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }

    async _stubUrls(slug, total, BASE) {
        return Array.from({ length: total }, (_, i) => ({
            sourceUrl: `${BASE}/read/${slug}/${i + 1}`,
            title: `Chapter ${i + 1}`,
        }));
    }
}

parserFactory.register("grandoldbooks.com", () => new GrandOldBooksParser());
