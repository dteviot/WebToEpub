/*
  Parser for https://chyoa.com
  Full recursive branching-story support with nested TOC.

  Architecture note
  -----------------
  CHYOA is a "Choose Your Own Adventure" site – stories are *trees*, not lists.
  The standard WebToEpub flow (flat chapter list → linear download → pack) doesn't
  fit.  We therefore override three key methods:

    getChapterUrls()    – does the full recursive tree-walk *here*, accumulating
                          content into this.chyoaItems as it goes.  Returns a flat
                          URL list so the UI table still populates correctly.

    fetchContent()      – no-op (everything was already fetched above).

    epubItemSupplier()  – builds ChyoaEpubItems with correct TOC *depth* values
                          so EpubPacker produces a proper nested Table of Contents.
*/
"use strict";

parserFactory.register("chyoa.com", () => new ChyoaParser());

// ---------------------------------------------------------------------------
// ChyoaEpubItem
// A custom EpubItem that carries a tree-depth for the nested TOC.
// ---------------------------------------------------------------------------
class ChyoaEpubItem extends EpubItem {
    /**
     * @param {string}  sourceUrl
     * @param {string}  title       Chapter title (shown in TOC)
     * @param {number}  index       Epub item index (determines filename)
     * @param {number}  tocDepth    Nesting level: 0 = root, 1 = first branch, …
     * @param {Node[]}  nodes       Array of DOM nodes to write into the XHTML file
     */
    constructor(sourceUrl, title, index, tocDepth, nodes) {
        super(sourceUrl);
        super.setIndex(index);
        this.chapterTitle = title || "";
        this.tocDepth     = tocDepth;
        this.nodes        = nodes;
    }

    // EpubItem.chapterInfo() is what EpubPacker iterates to build toc.ncx / nav.
    *chapterInfo() {
        if (this.chapterTitle) {
            yield {
                depth: this.tocDepth,
                title: this.chapterTitle,
                src:   this.getZipHref()
            };
        }
    }
}

// ---------------------------------------------------------------------------
// ChyoaParser
// ---------------------------------------------------------------------------
class ChyoaParser extends Parser {
    constructor() {
        super();
        // visitedUrls maps normalized URL → epub-item index.
        // Tracks what we've already fetched to handle circular links.
        this.visitedUrls = new Map();
        // Flat ordered list; each entry = { sourceUrl, title, index, depth, nodes }
        this.chyoaItems  = [];
        this._nextIndex  = 0;
    }

    // =========================================================================
    // STEP 1 – called by the framework after the first page is loaded.
    // We walk the entire story tree here.
    // =========================================================================
    async getChapterUrls(dom, chapterUrlsUI) {
        // Reset in case parser is reused
        this.visitedUrls = new Map();
        this.chyoaItems  = [];
        this._nextIndex  = 0;

        let rootUrl = dom.baseURI;
        await this._walkBranch(dom, rootUrl, 0, chapterUrlsUI);

        // Return flat list for the UI table (framework only needs sourceUrl + title)
        return this.chyoaItems.map(item => ({
            sourceUrl: item.sourceUrl,
            title:     item.title,
            isIncludeable: true
        }));
    }

    // =========================================================================
    // Recursive tree-walker
    // Mirrors parser.getlinksfromsite() / fetch_links() from chyoa.py
    // =========================================================================
    async _walkBranch(dom, url, depth, chapterUrlsUI) {
        let normUrl = util.normalizeUrlForCompare(url);

        // Guard: already visited (circular reference) – stop here
        if (this.visitedUrls.has(normUrl)) {
            return;
        }

        let index = this._nextIndex++;
        this.visitedUrls.set(normUrl, index);

        // ── Extract content nodes for this chapter ──
        let title   = this._extractChapterTitle(dom);
        let nodes   = this._extractContentNodes(dom, url);

        this.chyoaItems.push({ sourceUrl: url, title, index, depth, nodes });

        // Show live progress in the UI list while we're still walking
        if (chapterUrlsUI && typeof chapterUrlsUI.showTocProgress === "function") {
            chapterUrlsUI.showTocProgress([{ sourceUrl: url, title }]);
        }

        // ── Follow choice links ──
        let choices = this._extractChoiceLinks(dom);
        for (let { href } of choices) {
            let childNorm = util.normalizeUrlForCompare(href);
            if (this.visitedUrls.has(childNorm)) {
                // Already in tree – circular link; skip to avoid infinite recursion
                continue;
            }
            try {
                await this.rateLimitDelay();
                let childDom = (await HttpClient.wrapFetch(href)).responseXML;
                await this._walkBranch(childDom, href, depth + 1, chapterUrlsUI);
            } catch (err) {
                ErrorLog.log(`ChyoaParser: failed fetching ${href}: ${err}`);
            }
        }
    }

    // =========================================================================
    // DOM scraping helpers
    // =========================================================================

    /** Extract choice/branch links from a chapter page. */
    _extractChoiceLinks(dom) {
        let seen    = new Set();
        let results = [];

        // On CHYOA, choices live in div.question-content as <a> tags
        for (let a of dom.querySelectorAll("div.question-content a")) {
            let href = a.href;
            if (!href) continue;

            // Skip CHYOA's own UI action links (same filters as the Python scraper)
            if (href.includes("/new?type="))                  continue;
            let text = (a.textContent || "").trim();
            if (text === "Add a new chapter")                 continue;
            if (text === "Write a chapter")                   continue;
            if (text === "Link a chapter")                    continue;

            // Only follow links that stay on chyoa.com
            if (!href.includes("chyoa.com"))                  continue;

            let norm = util.normalizeUrlForCompare(href);
            if (seen.has(norm)) continue;
            seen.add(norm);

            results.push({ href, text });
        }
        return results;
    }

    /** Get the chapter title. Mirrors parser.extract_title_author() in chyoa.py. */
    _extractChapterTitle(dom) {
        // Chapter pages: <header class="chapter-header"><h1>…</h1>
        let chHeader = dom.querySelector("header.chapter-header");
        if (chHeader) {
            let h1 = chHeader.querySelector("h1");
            if (h1 && h1.textContent.trim()) return h1.textContent.trim();
            let h2 = chHeader.querySelector("h2");
            if (h2 && h2.textContent.trim()) return h2.textContent.trim();
        }
        // Story root pages: <header class="story-header"><h1>…</h1>
        let stHeader = dom.querySelector("header.story-header");
        if (stHeader) {
            let h1 = stHeader.querySelector("h1");
            if (h1 && h1.textContent.trim()) return h1.textContent.trim();
        }
        // Last resort: <title>
        return (dom.title || "").trim();
    }

    /**
     * Extract and clean the readable content for one chapter.
     * Returns an array of DOM nodes suitable for writing into an XHTML file.
     * Mirrors parser.extract_content() + saveEpub() content assembly in chyoa.py.
     */
    _extractContentNodes(dom, sourceUrl) {
        // Identify the chapter body
        let contentEl =
            dom.querySelector("div.chapter-content") ||
            dom.querySelector("div.layout-content-wrapper");

        // Build a clean wrapper div
        let wrapper = document.createElement("div");

        // 1. Chapter heading (from chapter-header)
        let chHeader = dom.querySelector("header.chapter-header");
        if (chHeader) {
            let h1 = chHeader.querySelector("h1");
            let h2 = chHeader.querySelector("h2");
            if (h1) {
                let heading = document.createElement("h2");
                heading.textContent = h1.textContent.trim();
                // Author is also in the chapter meta
                let meta = dom.querySelector("p.meta");
                if (meta) {
                    let a = meta.querySelector("a");
                    if (a) heading.textContent += " – by " + a.textContent.trim();
                }
                wrapper.appendChild(heading);
            }
            if (h2) {
                let subheading = document.createElement("h3");
                subheading.textContent = h2.textContent.trim();
                wrapper.appendChild(subheading);
            }
        }

        // 2. Story content
        if (contentEl) {
            // Clone so we don't mutate the live DOM
            let clone = contentEl.cloneNode(true);

            // Clean up unwanted elements
            this.removeUnwantedElementsFromContentElement(clone);

            wrapper.appendChild(clone);
        } else {
            let p = document.createElement("p");
            p.textContent = "[No content found for: " + sourceUrl + "]";
            wrapper.appendChild(p);
        }

        // 3. Question / choice prompt
        let qHeader = dom.querySelector("header.question-header h2");
        if (qHeader && qHeader.textContent.trim()) {
            let hr = document.createElement("hr");
            wrapper.appendChild(hr);
            let q = document.createElement("h3");
            q.textContent = qHeader.textContent.trim();
            wrapper.appendChild(q);
        }

        // 4. Choices as a list of links
        //    We use relative xhtml filenames that fixupHyperlinksInEpubItems()
        //    will resolve later (it rewrites chyoa.com URLs → ../Text/xhtmlXXX.xhtml)
        let choices = this._extractChoiceLinks(dom);
        if (choices.length > 0) {
            let ul = document.createElement("ul");
            for (let { href, text } of choices) {
                let li = document.createElement("li");
                let a  = document.createElement("a");
                a.href = href;   // will be rewritten to relative path by fixupHyperlinks
                a.textContent = text;
                li.appendChild(a);
                ul.appendChild(li);
            }
            wrapper.appendChild(ul);
        }

        return Array.from(wrapper.childNodes);
    }

    // =========================================================================
    // STEP 2 – fetchContent()
    // Content text was fetched during getChapterUrls(), but we must process
    // images here so they are properly collected, downloaded, and included
    // in the EPUB.
    // =========================================================================
    async fetchContent() {
        this.imageCollector.reset();
        this.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());

        // Get the list of URLs the user actually selected to include
        let includedUrls = new Set();
        for (let [url, page] of this.state.webPages) {
            if (page.isIncludeable !== false) {
                includedUrls.add(util.normalizeUrlForCompare(url));
            }
        }
        let filterBySelection = (includedUrls.size > 0);
        let itemsToProcess = filterBySelection
            ? this.chyoaItems.filter(item => includedUrls.has(util.normalizeUrlForCompare(item.sourceUrl)))
            : this.chyoaItems;

        this.setUiToShowLoadingProgress(itemsToProcess.length);

        for (let item of itemsToProcess) {
            let webPage = this.state.webPages.get(item.sourceUrl);
            if (!webPage) {
                webPage = { sourceUrl: item.sourceUrl, row: null };
            }

            if (webPage.row) {
                ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
            }

            // Wrap the nodes back into a DOM element so imageCollector can process them
            let wrapper = document.createElement("div");
            item.nodes.forEach(n => wrapper.appendChild(n));

            try {
                await this.fetchImagesUsedInDocument(wrapper, webPage);
            } catch (err) {
                ErrorLog.log(`ChyoaParser: failed fetching images for ${item.sourceUrl}: ${err}`);
            }

            // Store the modified nodes (with image tags replaced) back into the item
            item.nodes = Array.from(wrapper.childNodes);
        }
    }

    // =========================================================================
    // STEP 3 – epubItemSupplier()
    // Build EPUB items from our pre-collected chyoaItems list.
    // =========================================================================
    epubItemSupplier() {
        // Respect the user's selection: honour isIncludeable flags set via the UI
        // (webPages map is keyed by sourceUrl and carries isIncludeable after
        // populateChapterUrlsTable runs)
        let includedUrls = new Set();
        for (let [url, page] of this.state.webPages) {
            if (page.isIncludeable !== false) {
                includedUrls.add(util.normalizeUrlForCompare(url));
            }
        }

        // If the webPages map is empty (e.g., framework never called setPagesToFetch),
        // include everything.
        let filterBySelection = (includedUrls.size > 0);

        let epubItems = [];
        for (let item of this.chyoaItems) {
            if (filterBySelection &&
                !includedUrls.has(util.normalizeUrlForCompare(item.sourceUrl))) {
                continue;
            }

            // The imageCollector downloaded the images in fetchContent, but we must
            // now mutate the DOM elements to point to the local EPUB files.
            let wrapper = document.createElement("div");
            item.nodes.forEach(n => wrapper.appendChild(n));
            this.imageCollector.replaceImageTags(wrapper);
            let updatedNodes = Array.from(wrapper.childNodes);

            epubItems.push(
                new ChyoaEpubItem(
                    item.sourceUrl,
                    item.title,
                    item.index,
                    item.depth,
                    updatedNodes
                )
            );
        }

        this.fixupHyperlinksInEpubItems(epubItems);
        return new EpubItemSupplier(this, epubItems, this.imageCollector);
    }

    // =========================================================================
    // UI
    // =========================================================================

    /**
     * Appends a CHYOA-specific note to the "Searching for URLs, please wait"
     * banner so users know the tree-walk takes longer than a normal site.
     */
    populateUI(dom) {
        super.populateUI(dom);
        let waitMsg = document.getElementById("findingChapterUrlsMessageRow");
        if (waitMsg) {
            let note = document.createElement("span");
            note.textContent = " (CHYOA: fetching every branch — this may take several minutes for large stories)";
            note.style.fontStyle = "italic";
            waitMsg.appendChild(note);
        }
    }

    // =========================================================================
    // Metadata
    // =========================================================================
    extractTitleImpl(dom) {
        // Story root has <header class="story-header"><h1>…</h1>
        let h1 = dom.querySelector("header.story-header h1");
        if (h1) return h1.textContent.trim();
        return Parser.extractTitleDefault(dom);
    }

    extractAuthor(dom) {
        // Author link is inside <p class="meta"><a …>AuthorName</a>
        let a = dom.querySelector("p.meta a");
        if (a) return a.textContent.trim();
        return "<unknown>";
    }

    findContent(dom) {
        return (
            dom.querySelector("div.chapter-content") ||
            dom.querySelector("div.layout-content-wrapper")
        );
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.cover img");
        return img ? img.src : null;
    }

    // =========================================================================
    // Cleanup
    // =========================================================================
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(
            element,
            "footer, div.chyoa-adzone, div.ratings, div.links, nav, script, noscript, input, button"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    /**
     * For CHYOA we must NOT strip the choice links that appear in content –
     * they ARE the story navigation. Override to do nothing.
     */
    removeNextAndPreviousChapterHyperlinks() {
        // intentionally empty
    }
}
