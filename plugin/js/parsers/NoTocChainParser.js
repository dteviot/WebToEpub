// NoTocChainParser is instantiated by main.js based on crawler mode (it is not
// registered with parserFactory like the manual-select parsers), so the class
// is legitimately referenced only from another module's global scope.
"use strict";
// eslint-disable-next-line no-unused-vars
class NoTocChainParser extends DefaultParser {
    constructor(imageCollector) {
        super(imageCollector);
        this.visitedUrls = new Set();
        // Hidden structural CSS selector saved by updateSnifferStatusUI as a
        // seamless fallback when the user-facing text anchor fails on a later
        // chapter (e.g. dynamic "next chapter title" buttons).
        this.dynamicFallbackSelector = null;
    }

    populateUI(dom) {
        // Restore native routing to pause at the configuration page for unknown sites
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
        let coverUrl = this.findCoverImageUrl(dom);
        CoverImageUI.setCoverImageUrl(coverUrl);
    }

    getChapterUrls(dom) {
        this.updateSnifferStatusUI(dom, false);

        // Resolve the seed title with the SAME expression the crawl loop uses
        // (findChapterTitle(dom) || extractTitle(dom)) so the seed matches the
        // chapters crawled below it. constructFindContentLogicForSite() is
        // called now (findContent() re-assigns it later) so findChapterTitle()
        // can resolve the site's titleCss element for the seed too.
        this.logic = this.siteConfigs.constructFindContentLogicForSite(
            util.extractHostName(dom.baseURI));

        let titleObj = this.findChapterTitle(dom) || this.extractTitle(dom);
        let titleStr = titleObj instanceof HTMLElement
            ? titleObj.textContent
            : titleObj;
        titleStr = (titleStr && titleStr.trim()) || "Chapter 1";

        let firstChapter = {
            sourceUrl: dom.baseURI,
            title: titleStr,
            isIncludeable: true,
            parser: this,
            nextPrevChapters: new Set([dom.baseURI])
        };
        return Promise.resolve([firstChapter]);
    }

    /**
     * Resolve the *next* chapter URL from a single page DOM, reusing the
     * crawl loop's next-link sniff (findNextPageLinkElement +
     * extractUrlFromOnclick + resolveRelativeUrl). Used by the auto-resume
     * probe (Option B) to find N+1 from the last downloaded chapter.
     * Returns an absolute URL, or null when no usable "next" link exists.
     */
    extractNextChapterUrlFromDom(dom) {
        // Clear the seed's structural fallback: it was built from the seed
        // page's DOM and would mismatch this (last chapter's) page.
        this.dynamicFallbackSelector = null;
        return this.resolveNextUrlFromDom(dom);
    }

    /**
     * Pure next-link resolver shared by the crawl loop, visited-skip
     * recovery and extractNextChapterUrlFromDom. Does NOT reset
     * dynamicFallbackSelector (the probe clears it explicitly), so the
     * crawl loop's fallback stays intact. Returns an absolute URL, or
     * null when no usable "next" link exists.
     */
    resolveNextUrlFromDom(dom) {
        if (!dom) {
            return null;
        }
        let sniffResult = this.findNextPageLinkElement(dom, false);
        let sniffElement = sniffResult ? sniffResult.element : null;
        let nextUrlRelative = sniffElement ? sniffElement.getAttribute("href") : null;
        if ((!nextUrlRelative || nextUrlRelative.startsWith("#") || nextUrlRelative.startsWith("javascript")) && sniffElement) {
            nextUrlRelative = this.extractUrlFromOnclick(sniffElement);
        }
        if (nextUrlRelative && !nextUrlRelative.startsWith("#") && !nextUrlRelative.startsWith("javascript")) {
            try {
                return util.resolveRelativeUrl(dom.baseURI, nextUrlRelative);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    updateSnifferStatusUI(dom, isManualInput = false) {
        let statusUI = document.getElementById("nextPageDetectStatus");
        let inputUI = document.getElementById("nextPageCssInput");
        if (!statusUI || !inputUI) return;

        // Pass inverted isManualInput to ensure we don't ignore custom inputs during manual typing
        let result = this.findNextPageLinkElement(dom, !isManualInput); 
        
        if (result.element) {
            statusUI.textContent = "✅ Auto-detected";
            statusUI.style.color = "green";
            
            if (!isManualInput) {
                // 1. Generate and store a structural fallback silently
                let fallback = null;
                if (result.element.id) {
                    fallback = "#" + result.element.id;
                } else if (result.element.className && typeof result.element.className === "string" && result.element.className.trim()) {
                    fallback = "." + result.element.className.trim().split(/\s+/).join(".");
                }
                this.dynamicFallbackSelector = fallback;

                // 2. Display text to the user as the primary anchor
                let text = result.element.innerText || result.element.textContent;
                if (text && text.trim()) {
                    inputUI.value = text.trim();
                } else if (fallback) {
                    inputUI.value = fallback;
                }
            }
        } else if (result.hasFakeLink) {
            statusUI.textContent = "⚠️ Invalid next page button";
            statusUI.style.color = "orange";
            if (!isManualInput) inputUI.value = "";
        } else {
            statusUI.textContent = "⚠️ Please input text/CSS";
            statusUI.style.color = "red";
            if (!isManualInput) inputUI.value = "";
        }
    }

    findNextPageLinkElement(dom, ignoreInput = false) {
        // Per-sniff context: currentUrl is read-only; hasFakeLink accumulates
        // across every _isValidLink call so the caller can distinguish "no link
        // found" from "the page only exposes fake/self-pointing next links".
        let ctx = { currentUrl: dom.baseURI, hasFakeLink: false };

        // Priority 1 — user-supplied custom CSS selector / link text (skipped
        // when the caller is ignoring manual input, e.g. the auto-resume probe).
        if (!ignoreInput) {
            let customInput = document.getElementById("nextPageCssInput")?.value;
            if (customInput && customInput.trim() !== "") {
                let found = this._resolveCustomInputLink(dom, customInput.trim(), ctx);
                if (found) return { element: found, hasFakeLink: ctx.hasFakeLink };
            }
        }

        // Priority 2 — link text matching the multilingual next-page regex.
        let textFound = this._resolveTextRegexLink(dom, ctx);
        if (textFound) return { element: textFound, hasFakeLink: ctx.hasFakeLink };

        // Priority 3 — generic fallback selectors (rel=next, .next, ...).
        let fallbackFound = this._resolveFallbackLink(dom, ctx);
        return { element: fallbackFound || null, hasFakeLink: ctx.hasFakeLink };
    }

    // Validate one candidate as the next-page link. Sets ctx.hasFakeLink =
    // true for self-pointing/fake links (href === currentUrl or javascript/#
    // placeholder). isManualInput widens acceptance to onclick-based URLs.
    _isValidLink(link, isManualInput, ctx) {
        let href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript")) {
            // Manual CSS input may target elements that carry the next-page
            // URL in their onclick handler instead of an href attribute.
            if (isManualInput) {
                let onclickUrl = this.extractUrlFromOnclick(link);
                if (onclickUrl && !onclickUrl.startsWith("#") && !onclickUrl.startsWith("javascript")) {
                    try {
                        let absUrl = util.resolveRelativeUrl(ctx.currentUrl, onclickUrl);
                        let normUrl = util.normalizeUrlForCompare(absUrl);
                        if (normUrl === util.normalizeUrlForCompare(ctx.currentUrl)) {
                            ctx.hasFakeLink = true;
                            return false;
                        }
                        // ANTI-BACKWARD SHIELD: Reject links to already visited chapters
                        if (this.visitedUrls && this.visitedUrls.has(normUrl)) {
                            return false;
                        }
                        return true;
                    } catch (e) { /* ignore: malformed onclick URL, treat as invalid link */ }
                }
            }
            ctx.hasFakeLink = true;
            return false;
        }
        try {
            let absUrl = util.resolveRelativeUrl(ctx.currentUrl, href);
            let normUrl = util.normalizeUrlForCompare(absUrl);
            if (normUrl === util.normalizeUrlForCompare(ctx.currentUrl)) {
                ctx.hasFakeLink = true;
                return false;
            }
            // ANTI-BACKWARD SHIELD: Reject links to already visited chapters
            if (this.visitedUrls && this.visitedUrls.has(normUrl)) {
                return false;
            }
        } catch (e) { /* ignore: malformed href, fall through to text-based detection */ }
        return true;
    }

    // Return the first element matching `selector` that passes _isValidLink.
    // Native for...of avoids an O(n) intermediate array per scan.
    _findFirstValidLink(dom, selector, isManualInput, ctx) {
        for (let link of dom.querySelectorAll(selector)) {
            if (this._isValidLink(link, isManualInput, ctx)) {
                return link;
            }
        }
        return null;
    }

    // Priority 1 — resolve the user-defined next-page selector / link text.
    _resolveCustomInputLink(dom, customInput, ctx) {
        let s = customInput;

        // 1a. Treat the input as a CSS selector.
        try {
            let found = this._findFirstValidLink(dom, s, true, ctx);
            if (found) return found;
        } catch (e) { /* ignore: invalid CSS selector from user input */ }

        // 1b. Treat the input as link text — match the first <a>/<button>/[onclick]
        // whose visible text contains it. Native for...of over the NodeList.
        for (let l of dom.querySelectorAll("a, button, [onclick]")) {
            let text = l.innerText || l.textContent;
            if (text && text.includes(s) && this._isValidLink(l, true, ctx)) {
                return l;
            }
        }

        // 1c. Hidden dynamic fallback selector (e.g. chapter-specific text the
        // user input failed to match directly).
        if (this.dynamicFallbackSelector) {
            try {
                let found = this._findFirstValidLink(dom, this.dynamicFallbackSelector, true, ctx);
                if (found) return found;
            } catch (e) { /* ignore: dynamic fallback selector matched nothing on this page */ }
        }

        return null;
    }

    // Priority 2 — link text matching the multilingual next-page regex.
    _resolveTextRegexLink(dom, ctx) {
        const textRegex = /(下.*[页章篇节回])|(next.*(?:page|chapter|part))|(次のページ)|(次へ)|(다음화)/i;
        for (let link of dom.querySelectorAll("a")) {
            let linkText = link.innerText || link.textContent;
            if (linkText && textRegex.test(linkText.trim())) {
                if (this._isValidLink(link, false, ctx)) return link;
            }
        }
        return null;
    }

    // Priority 3 — generic next-page fallback selectors.
    _resolveFallbackLink(dom, ctx) {
        const fallbackSelectors = "a[rel=\"next\"], a.next, a.next-page, a#next_url, .nav-next a, .page-next, a.btn-next";
        return this._findFirstValidLink(dom, fallbackSelectors, false, ctx);
    }

    extractUrlFromOnclick(element) {
        let onclick = element.getAttribute("onclick");
        if (!onclick) return null;
        let match = onclick.match(/location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
        if (!match) return null;
        try {
            return util.resolveRelativeUrl(element.ownerDocument.baseURI, match[1]);
        } catch (e) {
            return null;
        }
    }

    /**
     * Ensure the given (already-fetched) webPage has a table row, then mark
     * it loaded and sync its title input. Both pre-crawl and newly
     * discovered chain rows are routed through the unified <tbody> writer
     * to prevent disjointed row rendering.
     */
    markWebPageLoaded(webPage) {
        if (!webPage.row) {
            ChapterUrlsUI.appendChapterRow(webPage, null, null, null, null);
            ChapterUrlsUI.resizeTitleColumnToFit(ChapterUrlsUI.getChapterUrlsTable());
        }
        if (webPage.row) {
            let titleInput = webPage.row.querySelector("input[type='text']");
            if (titleInput && webPage.title) {
                titleInput.value = webPage.title;
            }
            ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_LOADED);
        }
    }

    async fetchWebPages() {
        let pagesToFetch = [...this.state.webPages.values()].filter(c => c.isIncludeable);
        this.visitedUrls.clear();
        if (pagesToFetch.length === 0) {
            return Promise.reject(new Error("No starting URL found for Chain Crawler."));
        }

        await this.addParsersToPages(pagesToFetch);

        // Re-key the webPages map by normalizeUrlForCompare(): setPagesToFetch
        // and the main.js hydration path key by raw sourceUrl, but the crawl
        // loop keys by normalized URL (to match visitedUrls). Without this the
        // loop misses the pre-rendered seed and creates a duplicate row.
        // Object identity (.row, .isIncludeable, .rawDom) is preserved; first
        // wins on duplicate normalized keys.
        let normalizedWebPages = new Map();
        for (let page of this.state.webPages.values()) {
            let key = util.normalizeUrlForCompare(page.sourceUrl);
            if (!normalizedWebPages.has(key)) {
                normalizedWebPages.set(key, page);
            }
        }
        this.state.webPages = normalizedWebPages;

        let firstPage = pagesToFetch[0];
        let currentUrl = firstPage.sourceUrl;
        let chapterIndex = 0;
        let maxChapters = parseInt(this.userPreferences.maxChaptersPerEpub.value.replace(/,/g, "")) || 10000;

        this.imageCollector.reset();
        this.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());
        
        // No bulk row wipe needed: the pre-crawl table is updated in place
        // as each chapter is fetched. Both pre-crawl and newly discovered
        // chain rows are routed through the unified <tbody> writer to
        // prevent disjointed row rendering.

        ProgressBar.setMax(1);

        // Check sleepController each iteration so the native "Pause" button
        // (which aborts the controller) can halt the chain crawl gracefully.
        while (currentUrl && chapterIndex < maxChapters) {
            let normalizedUrl = util.normalizeUrlForCompare(currentUrl);

            // Already fetched in a prior iteration: skip re-fetching and try
            // to advance via the next link from the cached DOM. Only break
            // when no forward nextUrl can be resolved (genuine end of chain).
            if (this.visitedUrls.has(normalizedUrl)) {
                let existing = this.state.webPages.get(normalizedUrl);
                let cachedNext = (existing && existing.rawDom)
                    ? this.resolveNextUrlFromDom(existing.rawDom)
                    : null;
                if (!cachedNext) {
                    break;
                }
                currentUrl = cachedNext;
                continue;
            }
            this.visitedUrls.add(normalizedUrl);

            // Key state.webPages by the normalized URL so get/set/delete stay
            // consistent with the visitedUrls set (also normalized). The raw
            // URL is preserved on webPage.sourceUrl for display, fetching and
            // relative-URL resolution.
            let webPage = this.state.webPages.get(normalizedUrl);
            if (!webPage) {
                webPage = {
                    sourceUrl: currentUrl,
                    title: "[placeholder]",
                    isIncludeable: true,
                    parser: this, 
                    nextPrevChapters: new Set([currentUrl]), 
                    row: null 
                };
                this.state.webPages.set(normalizedUrl, webPage);
            }

            try {
                await this.rateLimitDelay();
                if (util.getSleepController().signal.aborted) {
                    webPage.isIncludeable = false;
                    this.state.webPages.delete(normalizedUrl);
                    break;
                }

                // Show a "downloading" indicator on the seed's pre-existing
                // row. History rows are filtered out by isIncludeable above
                // and never reach here; freshly discovered chapters (N+2,
                // N+3, ...) have no row yet — it is created after a
                // successful fetch in markWebPageLoaded().
                if (webPage.row) {
                    ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
                }

                let webPageDom = await this.fetchChapter(currentUrl);
                if (!webPageDom) {
                    throw new Error("Empty or invalid response from server");
                }
                webPage.rawDom = webPageDom;
                this.preprocessRawDom(webPageDom);
                this.removeUnusedElementsToReduceMemoryConsumption(webPageDom);

                let content = this.findContent(webPage.rawDom);
                if (content == null) throw new Error("Could not find article content");

                if (webPage.title === "[placeholder]") {
                    let titleObj = this.findChapterTitle(webPageDom, webPage) || this.extractTitle(webPageDom);
                    let titleStr = titleObj instanceof HTMLElement ? titleObj.textContent : titleObj;
                    webPage.title = titleStr ? titleStr.trim() : `Chapter ${chapterIndex + 1}`;
                }

                // Resolve the next URL via the shared resolver so the crawl
                // loop and visited-skip recovery use one sniff path.
                let nextUrl = this.resolveNextUrlFromDom(webPageDom);

                await this.fetchImagesUsedInDocument(content, webPage);
                // Update the seed's row in place, or create one via the unified
                // writer for newly discovered chapters (N+2, N+3, ...), then
                // mark loaded.
                this.markWebPageLoaded(webPage);
                
                chapterIndex++;
                ProgressBar.setMax(chapterIndex + 1);
                ProgressBar.setValue(chapterIndex);

                currentUrl = nextUrl;

            } catch (error) {
                webPage.isIncludeable = false;
                this.state.webPages.delete(normalizedUrl);

                // Remove any DOWNLOADING row whose webPage was discarded, so
                // the table never shows a stale "downloading" state for a
                // chapter that won't be packed.
                if (webPage.row && webPage.row.parentNode) {
                    webPage.row.parentNode.removeChild(webPage.row);
                }

                let reason = error.message || "Unknown network or parsing error";
                let isContentMissing = reason.includes("Could not find article content");
                let msg = "";

                if (isContentMissing) {
                    msg = `Crawling stopped after ${chapterIndex} chapter(s). ` +
                          "Reached a page with no chapter text — usually the end of " +
                          "the book, or an anti-bot / CAPTCHA interstitial " +
                          "(e.g. Cloudflare). Successfully fetched chapters will now " +
                          "be packed.\n" +
                          `Last URL: ${currentUrl}`;
                    // Surface as a warning, not a catastrophic crash
                    ErrorLog.showErrorMessage(msg);
                } else {
                    msg = `Chain crawling interrupted at chapter ${chapterIndex}: ` +
                          `${reason}. Successfully fetched chapters will now be packed.\n` +
                          `Last URL: ${currentUrl}`;
                    ErrorLog.showErrorMessage(msg);
                }
                break;
            }
        }
        
        ProgressBar.setMax(chapterIndex);
        ProgressBar.setValue(chapterIndex);
    }
}
