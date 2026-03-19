
"use strict";

class GrandOldBooksParser extends Parser {
    constructor() {
        super(new ImageCollector());
        this._meta          = null;
        this._catalogAuthor = null;
        this._coverImageUrl = null;
        this._glossary      = null;
    }

    async getChapterUrls(dom) {
        const slug = this._slugFromUrl(dom.baseURI);
        if (!slug) throw new Error("Cannot extract book slug: " + dom.baseURI);
        const BASE = "https://grandoldbooks.com";
        const OPTS = { credentials: "include" };

        // Try to pull glossary from the starting page's rendered DOM right now
        // (React renders it client-side but WebToEpub passes the live tab DOM)
        this._glossary = this._extractGlossaryFromDom(dom);

        // Primary: offline API
        try {
            const r = await fetch(`${BASE}/api/offline/books/${slug}`, OPTS);
            if (r.ok) {
                const p = await r.json();
                this._meta = p;
                if (p.coverImage) this._coverImageUrl =
                    p.coverImage.startsWith("http") ? p.coverImage : BASE + p.coverImage;
                if (!this._glossary && p.bookAnnotations?.glossary)
                    this._glossary = p.bookAnnotations.glossary;
                this._updateUIAsync();
                const chapters = p.chapters.map(ch => ({
                    sourceUrl: this._chapterUrl(slug, ch),
                    title: ch.title,
                }));
                return this._appendGlossary(chapters, slug, BASE);
            }
        } catch (e) { /* ignore */ }

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
                } catch (e) { /* ignore */ }
                // Try public annotations.json
                if (!this._glossary) {
                    try {
                        const ar = await fetch(`${BASE}/data/books/${slug}/annotations.json`, OPTS);
                        if (ar.ok) {
                            const ann = await ar.json();
                            this._glossary = ann?.glossary ?? null;
                        }
                    } catch (e) { /* ignore */ }
                }
                this._updateUIAsync();
                const chapters = await this._stubUrls(slug, m.totalChapters ?? 1, BASE);
                return this._appendGlossary(chapters, slug, BASE);
            }
        } catch (e) { /* ignore */ }

        const ndc = this._ndcChapters(dom);
        if (ndc?.length)
            return ndc.map(ch => ({ sourceUrl: this._chapterUrl(slug, ch), title: ch.title }));
        throw new Error("Could not get chapters for " + slug);
    }

    // Extract glossary from the live rendered DOM of the books page
    // (React renders glossary cards in the same page)
    _extractGlossaryFromDom(dom) {
        const result = {};
        // Try __NEXT_DATA__ (App Router doesn't expose pageProps, but worth trying)
        try {
            const s = dom.querySelector("#__NEXT_DATA__");
            const pp = JSON.parse(s?.textContent ?? "null")?.props?.pageProps;
            const g = pp?.bookAnnotations?.glossary ?? pp?.annotations?.glossary;
            if (g && Object.keys(g).length > 0) return g;
        } catch (e) { /* ignore */ }
        return Object.keys(result).length ? result : null;
    }

    // Add glossary as last chapter using a unique URL (avoids starting-URL dedup)
    _appendGlossary(chapters, slug, BASE) {
        if (!this._glossary || !Object.keys(this._glossary).length) return chapters;
        // ?_gob=glossary ensures WebToEpub treats this as a distinct URL
        chapters.push({
            sourceUrl: `${BASE}/books/${slug}?_gob=glossary`,
            title: "Glossary",
        });
        return chapters;
    }

    _buildGlossaryElement(dom) {
        const doc  = dom.ownerDocument ?? dom;
        const BASE = "https://grandoldbooks.com";

        // Map annotation types → display group (propernoun + footnote → "Places & Terms")
        const GROUP = {
            character:  "Characters",
            propernoun: "Places & Terms",
            footnote:   "Places & Terms",
            vocabulary: "Vocabulary",
        };
        const GROUP_ORDER = ["Characters", "Places & Terms", "Vocabulary"];

        // Bucket entries by display group, sorted alphabetically within each
        const buckets = {};
        GROUP_ORDER.forEach(g => (buckets[g] = []));
        for (const [key, entry] of Object.entries(this._glossary)) {
            const g = GROUP[entry.type] ?? "Places & Terms";
            buckets[g].push([key, entry]);
        }
        GROUP_ORDER.forEach(g => buckets[g].sort(([a], [b]) => a.localeCompare(b)));

        const art = doc.createElement("article");

        // ── Title ────────────────────────────────────────────────────
        const h2 = doc.createElement("h2");
        h2.textContent = "Glossary";
        art.appendChild(h2);

        // ── TOC nav ──────────────────────────────────────────────────
        const nav = doc.createElement("p");
        nav.textContent = GROUP_ORDER
            .map(g => `${g} (${buckets[g].length})`)
            .join(" · ");
        art.appendChild(nav);

        // ── One section per group ────────────────────────────────────
        for (const group of GROUP_ORDER) {
            const entries = buckets[group];
            if (!entries.length) continue;

            const h3 = doc.createElement("h3");
            h3.textContent = `${group} (${entries.length})`;
            art.appendChild(h3);

            // Characters with images: render as portrait cards BEFORE the table
            const withImg = entries.filter(([, e]) => !!e.image);
            if (withImg.length) {
                const gallery = doc.createElement("div");
                for (const [key, entry] of withImg) {
                    const card = doc.createElement("div");
                    const img  = doc.createElement("img");
                    img.src = entry.image.startsWith("http") ? entry.image : BASE + entry.image;
                    img.alt = key;
                    card.appendChild(img);
                    const cap = doc.createElement("p");
                    cap.textContent = key;
                    card.appendChild(cap);
                    gallery.appendChild(card);
                }
                art.appendChild(gallery);
            }

            // All entries in a table: Term | Category | Definition
            const table = doc.createElement("table");
            const thead = doc.createElement("thead");
            const hrow  = doc.createElement("tr");
            ["Term", "Category", "Definition"].forEach(t => {
                const th = doc.createElement("th");
                th.textContent = t;
                hrow.appendChild(th);
            });
            thead.appendChild(hrow);
            table.appendChild(thead);

            const tbody = doc.createElement("tbody");
            for (const [key, entry] of entries) {
                const tr = doc.createElement("tr");

                const tdTerm = doc.createElement("td");
                tdTerm.textContent = key;
                tr.appendChild(tdTerm);

                const tdCat = doc.createElement("td");
                const CAT_LABEL = { character: "Characters", proper_noun: "Places & Terms",
                    footnote: "Places & Terms", vocabulary: "Vocabulary" };
                tdCat.textContent = CAT_LABEL[entry.type] ?? entry.type;
                tr.appendChild(tdCat);

                const tdDef = doc.createElement("td");
                tdDef.textContent = entry.description ?? "";
                tr.appendChild(tdDef);

                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            art.appendChild(table);
        }
        return art;
    }

    // ── Core methods ──────────────────────────────────────────────────

    findContent(dom) {
        // Detect glossary page by query param (survives Next.js rendering)
        if (dom.baseURI?.includes("_gob=glossary") && this._glossary)
            return this._buildGlossaryElement(dom);
        return dom.querySelector(".min-h-screen");
    }

    extractTitleImpl(dom) {
        if (dom.baseURI?.includes("_gob=glossary")) return "Glossary";
        return dom.querySelector("h1")?.textContent?.trim() ?? null;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element?.tagName === "ARTICLE") return; // skip glossary
        util.removeChildElementsMatchingSelector(element,
            ".z-30, .z-50, .backdrop-blur-xl, .whitespace-nowrap, .flex.items-center, h3, [class*='audio'], [class*='gate']"
        );
        super.removeUnwantedElementsFromContentElement(element);
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

    _updateUIAsync() {
        const author = this._meta?.authorName ?? this._catalogAuthor;
        const desc   = this._meta?.summary;
        const genre  = Array.isArray(this._meta?.genre) ? this._meta.genre.join(", ") : null;
        const cover  = this._coverImageUrl;
        document.querySelectorAll("label").forEach(label => {
            const text = label.textContent.trim().toLowerCase();
            const el   = label.htmlFor ? document.getElementById(label.htmlFor)
                : label.querySelector("input, textarea");
            if (!el) return;
            if (author && text.includes("author"))                                         el.value = author;
            if (desc   && (text.includes("description") || text.includes("synopsis")))    el.value = desc;
            if (genre  && (text.includes("tag") || text.includes("subject") || text.includes("genre"))) el.value = genre;
            if (cover  && text.includes("cover"))                                          el.value = cover;
        });
        const set = (id, val) => { if (!val) return; const e = document.getElementById(id); if (e) e.value = val; };
        set("authorInput", author); set("epubAuthor", author);
        set("descriptionInput", desc); set("epubDescription", desc);
        set("tagsInput", genre); set("subjectInput", genre);
        set("coverUrl", cover); set("coverImageUrl", cover);
    }

    populateUI(dom) {
        super.populateUI(dom);
        const author = dom?.querySelector?.("meta[name=\"author\"]")?.getAttribute?.("content");
        const ogDesc = dom?.querySelector?.("meta[property=\"og:description\"]")?.getAttribute?.("content");
        const ogImg  = dom?.querySelector?.("meta[property=\"og:image\"]")?.getAttribute?.("content");
        if (!this._coverImageUrl && ogImg) this._coverImageUrl = ogImg;
        document.querySelectorAll("label").forEach(label => {
            const text = label.textContent.trim().toLowerCase();
            const el   = label.htmlFor ? document.getElementById(label.htmlFor)
                : label.querySelector("input, textarea");
            if (!el) return;
            if (author && text.includes("author") && (!el.value || el.value === "<unknown>")) el.value = author;
            if (ogDesc && (text.includes("description") || text.includes("synopsis")) && !el.value) el.value = ogDesc;
            if (ogImg  && text.includes("cover") && !el.value) el.value = ogImg;
        });
        const setIfEmpty = (id, val) => { if (!val) return; const e = document.getElementById(id); if (e && (!e.value || e.value === "<unknown>")) e.value = val; };
        setIfEmpty("authorInput", author); setIfEmpty("epubAuthor", author);
        setIfEmpty("coverUrl", ogImg);     setIfEmpty("coverImageUrl", ogImg);
    }

    // ── Helpers ───────────────────────────────────────────────────────

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
