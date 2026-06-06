/* LiveReaderUI — Standalone Live Web Novel Reader
   Reads a novel URL → shows book details page → then loads chapters dynamically.
   Uses HttpClient proxy + parser factory for best extraction.
*/
"use strict";

class LiveReaderUI {
    constructor() {
        this.url = null;
        this.parser = null;
        this.userPrefs = null;
        this.metaInfo = { title: "", author: "", coverUrl: "", description: "" };
        this.toc = [];
        this.currentChapterIndex = -1;

        // Reading state
        this.lazyCache = new Map();
        this.lazyPromiseMap = new Map();
        this.lazyPrefetchCount = 3;

        // Reader display state
        this.theme = "bw";
        this.fontSize = 100;
        this.layout = "scroll";
        this.font = "sans";
        this.headerHidden = false;
        this.ttsActive = false;
        this.voices = [];
        this.selectedVoiceURI = "";
        this.ttsParagraphs = [];
        this.ttsCurrentIndex = 0;
        this.speechUtterance = null;

        // IntersectionObserver for active chapter tracking
        this.observer = null;
        this.lazyLoadObserver = null;
        this.isNavigatingToChapter = false;
        this.navigationTimeout = null;
        this.loadedChaptersIndex = 0;
        this.lazyDomRenderedCount = 0;
        this.lazyVirtualScrollBatchSize = 20;

        // TOC config
        this.liveTocTimeoutMs = 30000;
        this.maxTocPagesToScan = 30;
        this.tocRetryAttempts = 1;
        this.tocFetchConcurrency = 4;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this._bindUIEvents();
        this._loadPreferences();

        const params = new URLSearchParams(window.location.search);
        const targetUrl = params.get("url");
        if (targetUrl) {
            this.url = targetUrl;
            this._showView("bookLoadingView");
            this._loadBookDetails(targetUrl);
        } else {
            this._showView("urlInputView");
        }
    }

    _loadPreferences() {
        try {
            if (typeof UserPreferences !== "undefined") {
                this.userPrefs = UserPreferences.readFromLocalStorage();
                HttpClient.enableCorsProxy = this.userPrefs.enableCorsProxy.value;
                HttpClient.corsProxyUrl = this.userPrefs.corsProxyUrl.value;
            }
        } catch (e) { /* ignore */ }

        const savedFontSize = localStorage.getItem("lr-font-size");
        this.fontSize = savedFontSize ? parseInt(savedFontSize, 10) : 100;

        const savedTheme = localStorage.getItem("lr-theme") || "bw";
        this.theme = savedTheme;

        const savedFont = localStorage.getItem("lr-font") || "sans";
        this.font = savedFont;
    }

    _showView(viewId) {
        ["urlInputView", "bookLoadingView", "bookDetailsView", "readerView"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === viewId) {
                    el.style.display = (id === "readerView") ? "block" : "flex";
                    el.classList.add("active");
                } else {
                    el.style.display = "none";
                    el.classList.remove("active");
                }
            }
        });
    }

    // ─────────────────────────────────────────
    // BOOK LOADING: Metadata + TOC
    // ─────────────────────────────────────────
    async _loadBookDetails(url) {
        this.url = url;
        this._setLoadStatus("Connecting...");
        try {
            if (typeof window.loadLiveReaderParsers === "function") {
                this._setLoadStatus("Loading parsers...");
                await window.loadLiveReaderParsers();
                this._setLoadStatus("Connecting...");
            }

            // Always enable CORS proxy for live fetching
            HttpClient.enableCorsProxy = true;

            let xhr = await HttpClient.wrapFetch(url);
            let doc = xhr?.responseXML;
            if (!doc && xhr?.responseText) {
                doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
            }
            if (!doc) throw new Error("Failed to fetch the novel page. The CORS proxy may have failed.");

            // Inject baseURI if possible
            try {
                Object.defineProperty(doc, "baseURI", { get: () => url, configurable: true });
            } catch (_) {}

            // Init parser
            this.parser = this._getParser(url, doc);

            // Extract metadata
            this.metaInfo.title = this._extractTitle(doc);
            this.metaInfo.author = this._extractAuthor(doc);
            this.metaInfo.coverUrl = this._extractCover(doc, url);
            this.metaInfo.description = this._extractDescription(doc);

            this._renderBookDetailsCard();
            this._showView("bookDetailsView");
            
            const addToLibBtn = document.getElementById("lrAddToLibraryBtn");
            if (addToLibBtn) {
                addToLibBtn.onclick = () => this._saveBookToLibrary();
            }

            // Load TOC in background (non-blocking)
            this._setLoadStatus("Loading chapter list...");
            this._startTocLoad(doc, url);

        } catch (err) {
            this._setLoadStatus("Error: " + err.message, true);
        }
    }

    async _startTocLoad(doc, url) {
        const tocStatus = document.getElementById("lrTocStatus");
        if (tocStatus) tocStatus.textContent = "Loading chapters…";

        try {
            // Check reading list for saved progress
            let savedChapUrl = null;
            if (this.userPrefs && this.userPrefs.readingList && this.url) {
                this.userPrefs.readingList.addEpub(this.url);
                savedChapUrl = this.userPrefs.readingList.getEpub(this.url);
            }

            if (savedChapUrl) {
                this.fastLoadChapterUrl = savedChapUrl;
                this._fetchChapterHtmlDirectly(savedChapUrl).catch(() => {});
            }

            this.toc = [];
            let fullToc = await this._extractToc(doc, url, (batch, startIndex) => {
                this.toc = this.toc.concat(batch);
                this._appendTocItems(batch, startIndex);
                this._appendReaderTocItems(batch, startIndex);
                this._updateReaderScrollSentinel();

                // Enable Start Reading button as soon as we have chapters
                const startBtn = document.getElementById("lrStartReadingBtn");
                if (startBtn && this.toc.length > 0 && startBtn.disabled) {
                    startBtn.disabled = false;
                    startBtn.textContent = "Start Reading";
                }

                if (tocStatus) {
                    tocStatus.textContent = `Scanning... ${this.toc.length} chapters found`;
                }
            });
            this.toc = fullToc;

            if (tocStatus) {
                tocStatus.textContent = this.toc.length > 0
                    ? `${this.toc.length} chapters found`
                    : "No chapters found on this page.";
            }

            // Enable Start Reading button final check
            const startBtn = document.getElementById("lrStartReadingBtn");
            if (startBtn && this.toc.length > 0) {
                startBtn.disabled = false;
                startBtn.textContent = "Start Reading";
                if (savedChapUrl) {
                    let idx = this.toc.findIndex(ch => ch.sourceUrl === savedChapUrl);
                    if (idx !== -1) {
                        startBtn.textContent = "Resume Reading";
                        startBtn.onclick = () => this._startReading(idx, true);
                        return;
                    }
                }
                startBtn.onclick = () => this._startReading(0);
            }

        } catch (err) {
            if (tocStatus) tocStatus.textContent = "TOC load failed: " + err.message;
        }
    }

    _renderBookDetailsCard() {
        const coverEl = document.getElementById("lrCoverImg");
        const titleEl = document.getElementById("lrBookTitle");
        const authorEl = document.getElementById("lrBookAuthor");
        const descEl = document.getElementById("lrBookDesc");

        if (coverEl) {
            if (this.metaInfo.coverUrl) {
                // Load directly without proxy, as <img> tags bypass CORS and Cloudflare blocks proxies for images
                coverEl.src = this.metaInfo.coverUrl;
                coverEl.style.display = "";
            } else {
                coverEl.style.display = "none";
            }
        }
        if (titleEl) titleEl.textContent = this.metaInfo.title || "Unknown Title";
        if (authorEl) authorEl.textContent = this.metaInfo.author
            ? "by " + this.metaInfo.author
            : "";
        if (descEl) descEl.textContent = this.metaInfo.description || "";
    }

    _appendTocItems(chapters, startIndex) {
        const tocList = document.getElementById("lrTocList");
        if (!tocList) return;

        // Remove loading placeholder
        const placeholder = document.getElementById("lrTocPlaceholder");
        if (placeholder) placeholder.remove();

        chapters.forEach((ch, i) => {
            const index = startIndex + i;
            if (tocList.querySelector(`[data-index="${index}"]`)) return;
            const li = document.createElement("li");
            li.className = "lr-toc-item";
            li.textContent = ch.title;
            li.dataset.index = index;
            li.title = ch.href;
            li.addEventListener("click", () => {
                this._startReading(index, true);
            });
            tocList.appendChild(li);
        });
    }

    _appendReaderTocItems(chapters, startIndex) {
        const tocList = document.getElementById("lrReaderTocList");
        if (!tocList || tocList.children.length === 0) return; // Not built yet

        chapters.forEach((ch, i) => {
            const index = startIndex + i;
            if (tocList.querySelector(`[data-index="${index}"]`)) return;
            const li = document.createElement("li");
            li.className = "lr-rtoc-item";
            li.textContent = ch.title;
            li.dataset.index = index;
            li.title = ch.href;
            li.addEventListener("click", () => {
                this.loadChapter(index);
                this._closeSidebarMobile();
            });
            tocList.appendChild(li);
        });

        const pageNumEl = document.getElementById("lrPageNum");
        if (pageNumEl && this.currentChapterIndex !== -1) {
            pageNumEl.textContent = `Chapter ${this.currentChapterIndex + 1} / ${this.toc.length}`;
        }

        // Update Next Chapter button in page-turn mode if needed
        if (this.layout !== "scroll" && this.currentChapterIndex !== -1) {
            const nextBtn = document.getElementById("lrNavNext");
            if (!nextBtn && this.currentChapterIndex < this.toc.length - 1) {
                const navEl = document.querySelector(".lr-chapter-nav");
                if (navEl) {
                    let navHtml = "";
                    if (this.currentChapterIndex > 0) {
                        navHtml += "<button class=\"lr-nav-btn\" id=\"lrNavPrev\">← Previous Chapter</button>";
                    } else {
                        navHtml += "<button class=\"lr-nav-btn\" id=\"lrNavPrev\">← Book Cover</button>";
                    }
                    navHtml += "<button class=\"lr-nav-btn lr-nav-primary\" id=\"lrNavNext\">Next Chapter →</button>";
                    navEl.innerHTML = navHtml;
                    
                    const prevBtn = document.getElementById("lrNavPrev");
                    const newNextBtn = document.getElementById("lrNavNext");
                    if (prevBtn) prevBtn.addEventListener("click", () => {
                        if (this.currentChapterIndex > 0) this.loadChapter(this.currentChapterIndex - 1);
                        else this._renderCoverPage();
                    });
                    if (newNextBtn) newNextBtn.addEventListener("click", () => this.loadChapter(this.currentChapterIndex + 1));
                }
            }
        }
    }

    _updateReaderScrollSentinel() {
        const contentBody = document.getElementById("lrContentBody");
        if (!contentBody || !document.getElementById("lr-chapter-wrap-cover")) return;

        const sentinel = document.getElementById("lrScrollSentinel");
        if (sentinel) {
            sentinel.textContent = `${this.toc.length - this.lazyDomRenderedCount} more chapters below…`;
        } else if (this.toc.length > this.lazyDomRenderedCount) {
            this._attachScrollSentinel(contentBody);
        }
    }

    _setLoadStatus(msg, isError = false) {
        const el = document.getElementById("lrLoadStatus");
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? "#ff6b6b" : "var(--primary, #00f5ff)";
    }

    // ─────────────────────────────────────────
    // START READING
    // ─────────────────────────────────────────
    _startReading(chapterIndex = 0, forceChapterLoad = false) {
        if (this.toc.length === 0) return;
        this._showView("readerView");
        this._applyReaderTheme();
        this._applyFont();
        this._applyFontSize(this.fontSize);
        this._initIntersectionObserver();
        this._initVoices();
        this._buildReaderToc();
        
        if (chapterIndex > 0 || forceChapterLoad) {
            this.loadChapter(chapterIndex);
        } else {
            this._renderCoverPage();
        }

        // Pre-fetch first chapters
        for (let i = 0; i < Math.min(this.lazyPrefetchCount, this.toc.length); i++) {
            this._loadChapterIntoCache(i).catch(() => {});
        }
    }

    // ─────────────────────────────────────────
    // READER: CHAPTER LOADING
    // ─────────────────────────────────────────
    async loadChapter(index) {
        if (index < 0 || index >= this.toc.length) return;
        this.currentChapterIndex = index;
        this.loadedChaptersIndex = index;
        this._saveProgress(index);

        if (this.layout === "scroll") {
            // Scroll view: ensure placeholder exists, then lazy load
            let wrapper = document.getElementById(`lr-chapter-wrap-${index}`);
            if (!wrapper) {
                // Build from beginning in scroll mode
                this._initializeScrollViewport(index);
                wrapper = document.getElementById(`lr-chapter-wrap-${index}`);
            }
            if (wrapper) {
                this.isNavigatingToChapter = true;
                if (wrapper.classList.contains("lr-placeholder-loading")) {
                    await this._lazyLoadChapter(index);
                }
                wrapper.scrollIntoView({ behavior: "auto", block: "start" });
                if (this.navigationTimeout) clearTimeout(this.navigationTimeout);
                this.navigationTimeout = setTimeout(() => {
                    this.isNavigatingToChapter = false;
                }, 150);
            }
            this.currentChapterIndex = index;
            this._updateActiveTocHighlight();
            return;
        }

        // Page-turn mode: direct load
        this._showReaderLoader("Loading Chapter...");
        try {
            await this._loadAndRenderSingleChapter(index);
        } finally {
            this._hideReaderLoader();
        }
    }

    async _lazyLoadChapter(index) {
        if (index < 0 || index >= this.toc.length) return;
        const wrapper = document.getElementById(`lr-chapter-wrap-${index}`);
        if (!wrapper || !wrapper.classList.contains("lr-placeholder-loading")) return;
        if (wrapper.dataset.loading === "true") return;
        wrapper.dataset.loading = "true";

        try {
            if (!this.lazyCache.has(index)) {
                await this._loadChapterIntoCache(index);
            }
            const html = this.lazyCache.get(index);
            if (!html) throw new Error("Empty chapter content");

            wrapper.classList.remove("lr-placeholder-loading");
            wrapper.classList.add("lr-loaded");
            wrapper.innerHTML = `
                <div class="lr-chapter-divider">
                    <span>${this.toc[index].title}</span>
                </div>
                <div class="lr-chapter-body">${html}</div>
            `;

            if (this.observer) this.observer.observe(wrapper);
            // Pre-fetch ahead
            for (let i = index + 1; i < index + 1 + this.lazyPrefetchCount && i < this.toc.length; i++) {
                this._loadChapterIntoCache(i).catch(() => {});
            }
        } catch (err) {
            wrapper.classList.remove("lr-placeholder-loading");
            wrapper.innerHTML = `
                <div class="lr-chapter-divider"><span>${this.toc[index].title}</span></div>
                <div class="lr-chapter-body" style="color:var(--reader-muted,#888);padding:20px;">
                    <p>Failed to load chapter: ${err.message}</p>
                    <button class="lr-retry-btn" data-index="${index}">Retry</button>
                </div>
            `;
            const retryBtn = wrapper.querySelector(".lr-retry-btn");
            if (retryBtn) {
                retryBtn.addEventListener("click", () => {
                    wrapper.classList.add("lr-placeholder-loading");
                    delete wrapper.dataset.loading;
                    this.lazyCache.delete(index);
                    this._lazyLoadChapter(index);
                });
            }
        }
    }

    async _loadChapterIntoCache(index) {
        if (index < 0 || index >= this.toc.length) return;
        if (this.lazyCache.has(index)) return;

        if (this.lazyPromiseMap.has(index)) {
            await this.lazyPromiseMap.get(index);
            return;
        }

        const chapter = this.toc[index];
        const fetchPromise = (async () => {
            if (this.fastLoadPromise && this.fastLoadChapterUrl === chapter.href) {
                try {
                    let html = await this.fastLoadPromise;
                    this.lazyCache.set(index, html);
                    return;
                } catch (e) {
                    // fall through to standard fetch if fast load failed
                }
            }

            let doc = null;
            // Try parser's fetchChapter first
            if (this.parser && typeof this.parser.fetchChapter === "function") {
                try {
                    doc = await this.parser.fetchChapter(chapter.href);
                } catch (_) {}
            }
            if (!doc) {
                let xhr = await HttpClient.wrapFetch(chapter.href);
                doc = xhr?.responseXML;
                if (!doc && xhr?.responseText) {
                    doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
                }
            }
            if (!doc) throw new Error("Failed to load chapter from server");

            const contentEl = this._extractChapterContent(doc, chapter.href);
            let html = contentEl ? contentEl.innerHTML : (doc.body ? doc.body.innerHTML : "");

            // Sanitize
            const temp = document.createElement("div");
            temp.innerHTML = html;
            temp.querySelectorAll("script,style,iframe,select,input,button,noscript,nav,header,footer,[class*='ad'],[id*='ad']").forEach(el => el.remove());
            html = temp.innerHTML;

            this.lazyCache.set(index, html);
        })();

        this.lazyPromiseMap.set(index, fetchPromise);
        try {
            await fetchPromise;
        } finally {
            this.lazyPromiseMap.delete(index);
        }
    }

    async _loadAndRenderSingleChapter(index) {
        if (!this.lazyCache.has(index)) {
            await this._loadChapterIntoCache(index);
        }
        const html = this.lazyCache.get(index) || "<p>Failed to load chapter.</p>";
        const chapter = this.toc[index];

        const contentBody = document.getElementById("lrContentBody");
        if (!contentBody) return;
        contentBody.innerHTML = "";

        const divider = document.createElement("div");
        divider.className = "lr-chapter-divider";
        divider.innerHTML = `<span>${chapter.title}</span>`;
        contentBody.appendChild(divider);

        const body = document.createElement("div");
        body.className = "lr-chapter-body";
        body.innerHTML = html;
        contentBody.appendChild(body);

        // Nav buttons
        const nav = document.createElement("div");
        nav.className = "lr-chapter-nav";
        let navHtml = "";
        if (index > 0) {
            navHtml += "<button class=\"lr-nav-btn\" id=\"lrNavPrev\">← Previous Chapter</button>";
        } else {
            navHtml += "<button class=\"lr-nav-btn\" id=\"lrNavPrev\">← Book Cover</button>";
        }
        if (index < this.toc.length - 1) {
            navHtml += "<button class=\"lr-nav-btn lr-nav-primary\" id=\"lrNavNext\">Next Chapter →</button>";
        }
        nav.innerHTML = navHtml;
        contentBody.appendChild(nav);

        const prevBtn = document.getElementById("lrNavPrev");
        const nextBtn = document.getElementById("lrNavNext");
        if (prevBtn) prevBtn.addEventListener("click", () => {
            if (index > 0) this.loadChapter(index - 1);
            else this._renderCoverPage();
        });
        if (nextBtn) nextBtn.addEventListener("click", () => this.loadChapter(index + 1));

        // Update header
        const chapterNameEl = document.getElementById("lrCurrentChapterName");
        if (chapterNameEl) chapterNameEl.textContent = chapter.title;

        const pageNumEl = document.getElementById("lrPageNum");
        if (pageNumEl) pageNumEl.textContent = `Chapter ${index + 1} / ${this.toc.length}`;

        document.getElementById("lrViewport").scrollTop = 0;

        this.currentChapterIndex = index;
        this._updateActiveTocHighlight();

        // Prefetch ahead
        for (let i = index + 1; i < index + 1 + this.lazyPrefetchCount && i < this.toc.length; i++) {
            this._loadChapterIntoCache(i).catch(() => {});
        }
    }

    // ─────────────────────────────────────────
    // SCROLL VIEW VIEWPORT
    // ─────────────────────────────────────────
    _initializeScrollViewport(targetIndex = -1) {
        const contentBody = document.getElementById("lrContentBody");
        if (!contentBody) return;
        contentBody.innerHTML = "";

        // Cover section
        this._appendCoverToScrollView(contentBody);

        // Chapter placeholders (virtualized)
        let limit = this.lazyVirtualScrollBatchSize;
        if (targetIndex >= 0) {
            limit = Math.max(limit, targetIndex + 1);
        }
        limit = Math.min(limit, this.toc.length);

        for (let i = 0; i < limit; i++) {
            this._createScrollPlaceholder(contentBody, this.toc[i], i);
        }
        this.lazyDomRenderedCount = limit;

        if (this.toc.length > limit) {
            this._attachScrollSentinel(contentBody);
        }
    }

    _appendCoverToScrollView(contentBody) {
        const coverSrc = this.metaInfo.coverUrl || "";
        const wrap = document.createElement("div");
        wrap.className = "lr-scroll-wrap";
        wrap.dataset.index = -1;
        wrap.dataset.title = "Book Cover";
        wrap.id = "lr-chapter-wrap-cover";
        wrap.innerHTML = `
            <div class="lr-cover-section">
                ${coverSrc ? `<img src="${coverSrc}" alt="Cover" class="lr-scroll-cover-img" onerror="this.onerror=null; if(typeof HttpClient !== 'undefined' && HttpClient.corsProxyUrl) { this.src = HttpClient.corsProxyUrl + encodeURIComponent('${coverSrc}'); }">` : ""}
                <h1 class="lr-scroll-cover-title">${this.metaInfo.title || "Novel"}</h1>
                <div class="lr-scroll-cover-author">${this.metaInfo.author ? "by " + this.metaInfo.author : ""}</div>
                <div class="lr-scroll-start-hint">↓ SCROLL TO START READING ↓</div>
            </div>
        `;
        contentBody.appendChild(wrap);
        if (this.observer) this.observer.observe(wrap);
    }

    _createScrollPlaceholder(contentBody, chapter, index) {
        const wrapper = document.createElement("div");
        wrapper.className = "lr-scroll-wrap lr-placeholder-loading";
        wrapper.dataset.index = index;
        wrapper.dataset.title = chapter.title;
        wrapper.id = `lr-chapter-wrap-${index}`;
        wrapper.innerHTML = `
            <div class="lr-chapter-divider">
                <span>${chapter.title}</span>
            </div>
            <div class="lr-skeleton-container">
                <div class="lr-skeleton-line" style="width:45%"></div>
                <div class="lr-skeleton-line" style="width:92%"></div>
                <div class="lr-skeleton-line" style="width:87%"></div>
                <div class="lr-skeleton-line" style="width:90%"></div>
                <div class="lr-skeleton-line" style="width:82%"></div>
            </div>
        `;
        contentBody.appendChild(wrapper);
        if (this.observer) this.observer.observe(wrapper);
        if (this.lazyLoadObserver) this.lazyLoadObserver.observe(wrapper);
    }

    _attachScrollSentinel(contentBody) {
        const existing = document.getElementById("lrScrollSentinel");
        if (existing) existing.remove();

        const sentinel = document.createElement("div");
        sentinel.id = "lrScrollSentinel";
        sentinel.style.cssText = "height:60px;display:flex;align-items:center;justify-content:center;color:var(--reader-muted,#888);font-size:0.85rem;";
        sentinel.textContent = `${this.toc.length - this.lazyDomRenderedCount} more chapters below…`;
        contentBody.appendChild(sentinel);

        const obs = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            obs.disconnect();
            sentinel.remove();
            const start = this.lazyDomRenderedCount;
            const end = Math.min(start + this.lazyVirtualScrollBatchSize, this.toc.length);
            for (let i = start; i < end; i++) {
                this._createScrollPlaceholder(contentBody, this.toc[i], i);
            }
            this.lazyDomRenderedCount = end;
            if (end < this.toc.length) this._attachScrollSentinel(contentBody);
        }, {
            root: document.getElementById("lrViewport"),
            rootMargin: "0px 0px 400px 0px"
        });
        obs.observe(sentinel);
    }

    // ─────────────────────────────────────────
    // COVER PAGE (PAGE-TURN MODE)
    // ─────────────────────────────────────────
    _renderCoverPage() {
        if (this.layout === "scroll") {
            if (!document.getElementById("lr-chapter-wrap-cover")) {
                this._initializeScrollViewport();
            }
            const cover = document.getElementById("lr-chapter-wrap-cover");
            if (cover) cover.scrollIntoView({ behavior: "auto", block: "start" });
            this.currentChapterIndex = -1;
            this._updateActiveTocHighlight();
            return;
        }

        const contentBody = document.getElementById("lrContentBody");
        if (!contentBody) return;
        const coverSrc = this.metaInfo.coverUrl || "";
        contentBody.innerHTML = `
            <div class="lr-cover-section" style="min-height:80vh;">
                ${coverSrc ? `<img src="${coverSrc}" alt="Book Cover" class="lr-cover-img">` : ""}
                <h1 class="lr-cover-title">${this.metaInfo.title || "Novel"}</h1>
                <div class="lr-cover-author">${this.metaInfo.author ? "by " + this.metaInfo.author : ""}</div>
                ${this.metaInfo.description ? `<p class="lr-cover-desc">${this.metaInfo.description}</p>` : ""}
                ${this.toc.length > 0 ? "<button class=\"lr-start-btn\" onclick=\"window.liveReader.loadChapter(0)\">Start Reading →</button>" : ""}
            </div>
        `;
        document.getElementById("lrViewport").scrollTop = 0;
        this.currentChapterIndex = -1;
        this._updateActiveTocHighlight();
    }

    // ─────────────────────────────────────────
    // READER TOC SIDEBAR
    // ─────────────────────────────────────────
    _buildReaderToc() {
        const tocList = document.getElementById("lrReaderTocList");
        if (!tocList) return;
        tocList.innerHTML = "";

        // Cover item
        const coverLi = document.createElement("li");
        coverLi.className = "lr-rtoc-item active";
        coverLi.id = "lr-rtoc-cover";
        coverLi.textContent = "Book Cover";
        coverLi.addEventListener("click", () => {
            this._renderCoverPage();
            this._closeSidebarMobile();
        });
        tocList.appendChild(coverLi);

        this.toc.forEach((ch, i) => {
            const li = document.createElement("li");
            li.className = "lr-rtoc-item";
            li.textContent = ch.title;
            li.dataset.index = i;
            li.title = ch.href;
            li.addEventListener("click", () => {
                this.loadChapter(i);
                this._closeSidebarMobile();
            });
            tocList.appendChild(li);
        });
    }

    _updateActiveTocHighlight() {
        document.querySelectorAll(".lr-rtoc-item").forEach(el => el.classList.remove("active"));
        if (this.currentChapterIndex === -1) {
            const c = document.getElementById("lr-rtoc-cover");
            if (c) c.classList.add("active");
        } else {
            const el = document.querySelector(`.lr-rtoc-item[data-index="${this.currentChapterIndex}"]`);
            if (el) {
                el.classList.add("active");
                el.scrollIntoView({ block: "nearest" });
            }
        }
    }

    // ─────────────────────────────────────────
    // INTERSECTION OBSERVERS (SCROLL MODE)
    // ─────────────────────────────────────────
    _initIntersectionObserver() {
        if (this.observer) this.observer.disconnect();
        if (this.lazyLoadObserver) this.lazyLoadObserver.disconnect();

        const viewport = document.getElementById("lrViewport");

        this.observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = parseInt(entry.target.dataset.index);
                    if (isNaN(idx)) return;
                    if (this.currentChapterIndex !== idx) {
                        this.currentChapterIndex = idx;
                        this._saveProgress(idx);
                    }

                    const nameEl = document.getElementById("lrCurrentChapterName");
                    const pageNumEl = document.getElementById("lrPageNum");
                    if (nameEl) nameEl.textContent = entry.target.dataset.title || "";
                    if (pageNumEl) {
                        pageNumEl.textContent = idx === -1
                            ? "Book Cover"
                            : `Chapter ${idx + 1} / ${this.toc.length}`;
                    }
                    this._updateActiveTocHighlight();

                    // Eagerly load next 3 chapters
                    for (let i = idx; i <= idx + 3 && i < this.toc.length; i++) {
                        this._lazyLoadChapter(i);
                    }
                }
            });
        }, { root: viewport, rootMargin: "0px 0px -50% 0px", threshold: 0 });

        this.lazyLoadObserver = new IntersectionObserver(entries => {
            if (this.isNavigatingToChapter) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = parseInt(entry.target.dataset.index);
                    if (idx >= 0 && entry.target.classList.contains("lr-placeholder-loading")) {
                        if (idx <= this.currentChapterIndex + 3) {
                            this._lazyLoadChapter(idx);
                        }
                    }
                }
            });
        }, { root: viewport, rootMargin: "-40px 0px 600px 0px", threshold: 0 });
    }

    // ─────────────────────────────────────────
    // METADATA EXTRACTION
    // ─────────────────────────────────────────
    _getParser(url, doc) {
        try {
            if (typeof parserFactory === "undefined") return null;
            const p = parserFactory.fetch(url, doc);
            if (!p) return null;
            p.state.chapterListUrl = url;
            p.state.firstPageDom = doc;
            if (this.userPrefs) {
                try { p.onUserPreferencesUpdate(this.userPrefs); } catch (_) {}
            }
            return p;
        } catch (_) { return null; }
    }

    _extractTitle(doc) {
        if (this.parser) {
            try { const t = this.parser.extractTitle(doc); if (t) return t.replace(/[\-\|].+$/, "").trim(); } catch (_) {}
        }
        const og = doc.querySelector("meta[property='og:title']");
        if (og?.content) return og.content.replace(/[\-\|].+$/, "").trim();
        return doc.title ? doc.title.replace(/[\-\|].+$/, "").trim() : "Unknown Novel";
    }

    _extractAuthor(doc) {
        if (this.parser) {
            try {
                const a = this.parser.extractAuthor(doc);
                if (a && a.trim() && a.trim() !== "<unknown>") return a.trim();
            } catch (_) {}
        }
        const metas = [
            doc.querySelector("meta[property='og:book:author']"),
            doc.querySelector("meta[name='author']"),
        ];
        for (const m of metas) { if (m?.getAttribute("content")) return m.getAttribute("content").trim(); }
        const el = doc.querySelector(".author, [class*='author'] a, [id*='author']");
        return el ? el.textContent.trim() : "";
    }

    _extractCover(doc, baseUrl) {
        const og = doc.querySelector("meta[property='og:image']");
        if (og?.getAttribute("content")) {
            try { return new URL(og.getAttribute("content"), baseUrl).href; } catch (_) {}
        }
        const bookCover = doc.querySelector(".book-cover img, .cover img, img.cover, .novel-cover img, .book img");
        if (bookCover) {
            const attrNames = ["src", "data-src", "data-original", "data-lazy-src", "data-cover"];
            for (const name of attrNames) {
                const val = bookCover.getAttribute(name);
                if (val && val.trim()) {
                    try { return new URL(val.trim(), baseUrl).href; } catch (_) {}
                }
            }
        }
        return "";
    }

    _extractDescription(doc) {
        // Try parser first if it has a custom description extraction
        if (this.parser && typeof this.parser.extractDescription === "function") {
            try {
                const d = this.parser.extractDescription(doc);
                if (d && d.trim()) return d.trim().slice(0, 800);
            } catch (_) {}
        }

        // Try page CSS selectors first (they contain the actual detailed synopsis)
        const selectors = [
            ".summary .content", ".summary", ".description", ".synopsis",
            ".novel-desc", "[class*='desc']"
        ];
        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) {
                const cloned = el.cloneNode(true);
                // Remove header titles like "Summary" or UI elements like "Show More"
                cloned.querySelectorAll("h1, h2, h3, h4, h5, h6, .expand, .expand-btn, button, nav, a").forEach(e => e.remove());
                const txt = cloned.textContent.trim().replace(/\s+/g, " ");
                // Ensure we got a reasonably long description rather than generic small text
                if (txt && txt.length > 50 && !txt.toLowerCase().includes("online free from your mobile")) {
                    return txt.slice(0, 800);
                }
            }
        }

        // Fallback to meta tags
        const og = doc.querySelector("meta[property='og:description']");
        if (og?.getAttribute("content")) {
            const val = og.getAttribute("content").trim();
            if (!val.toLowerCase().includes("online free from your mobile")) return val;
        }
        const meta = doc.querySelector("meta[name='description']");
        if (meta?.getAttribute("content")) {
            const val = meta.getAttribute("content").trim();
            if (!val.toLowerCase().includes("online free from your mobile")) return val;
        }
        
        return "";
    }

    // ─────────────────────────────────────────
    // TOC EXTRACTION
    // ─────────────────────────────────────────
    async _extractToc(doc, url, onBatch) {
        let collector = [];
        let numReported = 0;

        const chapterUrlsUI = {
            showTocProgress: (chapters) => {
                if (!Array.isArray(chapters) || chapters.length === 0) return;
                collector = collector.concat(chapters);
                const normalized = this._normalizeToc(collector, url);
                if (normalized.length > numReported) {
                    const newBatch = normalized.slice(numReported);
                    if (newBatch.length > 0 && typeof onBatch === "function") {
                        onBatch(newBatch, numReported);
                        numReported = normalized.length;
                    }
                }
            }
        };

        // Try parser TOC
        if (this.parser && typeof this.parser.getChapterUrls === "function") {
            const originalRateLimitDelay = this.parser.rateLimitDelay;
            try {
                // Temporarily disable throttle for super-fast TOC scanning
                this.parser.rateLimitDelay = async () => {};
                
                const parserChapters = await this._withTimeout(
                    this.parser.getChapterUrls(doc, chapterUrlsUI),
                    this.liveTocTimeoutMs,
                    "TOC extraction timed out."
                );
                const normalized = this._normalizeToc(parserChapters, url);
                if (normalized.length > numReported && typeof onBatch === "function") {
                    onBatch(normalized.slice(numReported), numReported);
                }
                if (normalized.length > 0) return normalized;
            } catch (err) {
                console.warn("[LiveReader] Parser TOC failed:", err);
                const partial = this._normalizeToc(collector, url);
                if (partial.length > 0) return partial;
            } finally {
                if (this.parser) {
                    this.parser.rateLimitDelay = originalRateLimitDelay;
                }
            }
        }

        // Fallback: heuristic link extraction
        const fallback = this._heuristicChapterLinks(doc, url);
        if (fallback.length > numReported && typeof onBatch === "function") {
            onBatch(fallback.slice(numReported), numReported);
        }
        return fallback;
    }

    _heuristicChapterLinks(doc, baseUrl) {
        const links = Array.from(doc.querySelectorAll("a"));
        const chapters = [];
        const seen = new Set();

        links.forEach(a => {
            let href = a.href;
            if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
            let absoluteUrl;
            try { absoluteUrl = new URL(href, baseUrl).href; } catch (_) { return; }
            if (seen.has(absoluteUrl)) return;

            const text = a.textContent.trim();
            const textLower = text.toLowerCase();
            const hrefLower = absoluteUrl.toLowerCase();

            const isChapter = textLower.includes("chapter") || textLower.includes("ch ") ||
                hrefLower.includes("chapter") || hrefLower.includes("/ch-") || hrefLower.includes("/read/");

            if (isChapter && text.length > 0 && text.length < 120) {
                seen.add(absoluteUrl);
                chapters.push({ title: text, href: absoluteUrl, sourceUrl: absoluteUrl });
            }
        });

        return this._normalizeToc(chapters, baseUrl);
    }

    _normalizeToc(chapters, baseUrl) {
        if (!Array.isArray(chapters)) return [];
        const seen = new Set();
        return chapters.filter(ch => {
            const url = ch?.sourceUrl || ch?.href || (typeof ch === "string" ? ch : null);
            if (!url || seen.has(url)) return false;
            seen.add(url);
            return true;
        }).map((ch, i) => {
            let rawUrl = ch?.sourceUrl || ch?.href || (typeof ch === "string" ? ch : null);
            if (rawUrl && !rawUrl.startsWith("http")) {
                try {
                    rawUrl = new URL(rawUrl, baseUrl).href;
                } catch(e) {}
            }
            return {
                title: ch.title?.trim() || `Chapter ${i + 1}`,
                href: rawUrl,
                sourceUrl: rawUrl
            };
        });
    }

    // ─────────────────────────────────────────
    // CHAPTER CONTENT EXTRACTION
    // ─────────────────────────────────────────
    _extractChapterContent(doc, url) {
        // 1. Parser
        if (this.parser && typeof this.parser.findContent === "function") {
            try {
                if (typeof this.parser.preprocessRawDom === "function") this.parser.preprocessRawDom(doc);
                if (typeof this.parser.removeUnusedElementsToReduceMemoryConsumption === "function") {
                    this.parser.removeUnusedElementsToReduceMemoryConsumption(doc);
                }
                const el = this.parser.findContent(doc);
                if (el) return el.cloneNode(true);
            } catch (_) {}
        }

        // 2. Default parser configs from localStorage
        try {
            const hostname = url ? new URL(url).hostname.replace(/^www\./, "") : "";
            const serialized = window.localStorage.getItem("DefaultParserConfigs");
            if (serialized && hostname) {
                const configs = JSON.parse(serialized);
                for (const [host, cfg] of configs) {
                    if (host.replace(/^www\./, "").toLowerCase() === hostname.toLowerCase() && cfg.contentCss) {
                        const el = doc.querySelector(cfg.contentCss);
                        if (el) {
                            const cloned = el.cloneNode(true);
                            if (cfg.removeCss) cloned.querySelectorAll(cfg.removeCss).forEach(r => r.remove());
                            return cloned;
                        }
                    }
                }
            }
        } catch (_) {}

        // 3. Generic selectors
        const selectors = [
            ".chapter-content", ".entry-content", ".read-content",
            "#chapter-content", "#chapterContent", "article",
            ".post-content", ".chapter-inner", ".novel-content",
            ".reader-content", ".text-left", ".chapter-text"
        ];
        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el && el.querySelectorAll("p").length > 2) return el.cloneNode(true);
        }

        // 4. Best div by paragraph count
        let best = null, maxP = 0;
        doc.querySelectorAll("div, section, article").forEach(el => {
            const count = el.querySelectorAll("p").length;
            if (count > maxP) { maxP = count; best = el; }
        });
        if (best && maxP > 2) return best.cloneNode(true);

        return doc.body ? doc.body.cloneNode(true) : null;
    }

    // ─────────────────────────────────────────
    // READER DISPLAY — THEME, FONT, SIZE
    // ─────────────────────────────────────────
    _applyReaderTheme() {
        const main = document.getElementById("lrReaderMain");
        if (!main) return;
        main.className = `lr-theme-${this.theme}`;
        document.querySelectorAll(".lr-theme-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.theme === this.theme);
        });
        localStorage.setItem("lr-theme", this.theme);
    }

    _applyFont(fontFace) {
        if (fontFace) this.font = fontFace;
        const main = document.getElementById("lrReaderMain");
        if (!main) return;
        main.classList.remove("lr-font-sans", "lr-font-serif", "lr-font-mono", "lr-font-dyslexic");
        main.classList.add(`lr-font-${this.font}`);
        localStorage.setItem("lr-font", this.font);
    }

    _applyFontSize(size) {
        this.fontSize = size;
        const main = document.getElementById("lrReaderMain");
        if (main) main.style.setProperty("--lr-font-size", `${(size / 100) * 1.1}rem`);
        const display = document.getElementById("lrFontSizeDisplay");
        if (display) display.textContent = `${size}%`;
        localStorage.setItem("lr-font-size", size);
    }

    // ─────────────────────────────────────────
    // TTS
    // ─────────────────────────────────────────
    _initVoices() {
        const voiceSelect = document.getElementById("lrTtsVoiceSelect");
        if (!voiceSelect) return;
        const populate = () => {
            this.voices = window.speechSynthesis.getVoices();
            voiceSelect.innerHTML = "<option value=\"\">Default Voice</option>";
            this.voices.forEach(v => {
                const opt = document.createElement("option");
                opt.value = v.voiceURI;
                opt.textContent = `${v.name} (${v.lang})`;
                if (v.voiceURI === this.selectedVoiceURI) opt.selected = true;
                voiceSelect.appendChild(opt);
            });
        };
        populate();
        if (window.speechSynthesis?.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populate;
        }
        voiceSelect.addEventListener("change", e => { this.selectedVoiceURI = e.target.value; });
    }

    _prepareTTSParagraphs() {
        const contentBody = document.getElementById("lrContentBody");
        if (!contentBody) return;
        this.ttsParagraphs = Array.from(contentBody.querySelectorAll("p, h1, h2, h3, blockquote, li"))
            .filter(el => el.textContent.trim().length > 10);
        const main = document.getElementById("lrReaderMain");
        if (main) main.classList.add("lr-tts-mode-active");
        // We no longer bind per-element click listeners here. Event delegation is used in _bindEvents.
    }

    _speakParagraph(index) {
        // Refresh paragraphs to account for newly loaded chapters
        this._prepareTTSParagraphs();
        if (index >= this.ttsParagraphs.length) { this._stopTTS(); return; }
        
        // Clear previous utterance handlers and cancel active speech to cleanly jump
        if (this.speechUtterance) {
            this.speechUtterance.onend = null;
            this.speechUtterance.onerror = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        
        const p = this.ttsParagraphs[index];
        this.currentTtsElement = p;
        document.querySelectorAll(".lr-tts-active-para").forEach(el => el.classList.remove("lr-tts-active-para"));
        p.classList.add("lr-tts-active-para");
        
        if (this.ttsAutoScroll !== false) {
            p.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        const rate = parseFloat(document.getElementById("lrTtsRate")?.value || 1);
        const pitch = parseFloat(document.getElementById("lrTtsPitch")?.value || 1);

        this.speechUtterance = new SpeechSynthesisUtterance(p.textContent);
        this.speechUtterance.rate = rate;
        this.speechUtterance.pitch = pitch;
        if (this.selectedVoiceURI) {
            const voice = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
            if (voice) this.speechUtterance.voice = voice;
        }
        this.speechUtterance.onend = () => {
            if (!this.ttsActive) return;
            // Re-evaluate current index based on the DOM in case new elements were added above
            this._prepareTTSParagraphs();
            const currentIdx = this.ttsParagraphs.indexOf(this.currentTtsElement);
            if (currentIdx !== -1) {
                this.ttsCurrentIndex = currentIdx + 1;
            } else {
                this.ttsCurrentIndex++;
            }
            this._speakParagraph(this.ttsCurrentIndex);
        };
        window.speechSynthesis.speak(this.speechUtterance);
    }

    _playTTS() {
        this.ttsActive = true;
        this.ttsAutoScroll = true; // reset auto-scroll on play
        this._prepareTTSParagraphs();
        const playBtn = document.getElementById("lrTtsPlayBtn");
        const pauseBtn = document.getElementById("lrTtsPauseBtn");
        if (playBtn) playBtn.style.display = "none";
        if (pauseBtn) pauseBtn.style.display = "";
        if (this.ttsCurrentIndex >= this.ttsParagraphs.length) this.ttsCurrentIndex = 0;
        this._speakParagraph(this.ttsCurrentIndex);
    }

    _pauseTTS() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            const playBtn = document.getElementById("lrTtsPlayBtn");
            const pauseBtn = document.getElementById("lrTtsPauseBtn");
            if (playBtn) playBtn.style.display = "";
            if (pauseBtn) pauseBtn.style.display = "none";
            this.ttsActive = false;
        }
    }

    _stopTTS() {
        this.ttsActive = false;
        window.speechSynthesis.cancel();
        document.querySelectorAll(".lr-tts-active-para").forEach(el => el.classList.remove("lr-tts-active-para"));
        const main = document.getElementById("lrReaderMain");
        if (main) main.classList.remove("lr-tts-mode-active");
        const playBtn = document.getElementById("lrTtsPlayBtn");
        const pauseBtn = document.getElementById("lrTtsPauseBtn");
        if (playBtn) playBtn.style.display = "";
        if (pauseBtn) pauseBtn.style.display = "none";
        this.ttsCurrentIndex = 0;
    }

    // ─────────────────────────────────────────
    // LOADER
    // ─────────────────────────────────────────
    _showReaderLoader(msg = "Loading...") {
        const el = document.getElementById("lrReaderLoader");
        const txt = document.getElementById("lrReaderLoaderText");
        if (el) el.style.display = "flex";
        if (txt) txt.textContent = msg;
    }

    _hideReaderLoader() {
        const el = document.getElementById("lrReaderLoader");
        if (el) el.style.display = "none";
    }

    // ─────────────────────────────────────────
    // SIDEBAR TOGGLE
    // ─────────────────────────────────────────
    _toggleSidebar() {
        const sidebar = document.getElementById("lrReaderSidebar");
        if (sidebar) sidebar.classList.toggle("lr-sidebar-collapsed");
    }

    _closeSidebarMobile() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById("lrReaderSidebar");
            if (sidebar) sidebar.classList.add("lr-sidebar-collapsed");
        }
    }

    // ─────────────────────────────────────────
    // UI EVENT BINDING
    // ─────────────────────────────────────────
    _bindUIEvents() {
        // URL Input form
        const goBtn = document.getElementById("lrGoBtn");
        const urlInput = document.getElementById("lrUrlInput");
        if (goBtn) goBtn.addEventListener("click", () => this._onUrlSubmit());
        if (urlInput) urlInput.addEventListener("keypress", e => { if (e.key === "Enter") this._onUrlSubmit(); });

        // Book details view
        const startReadBtn = document.getElementById("lrStartReadingBtn");
        // onClick is set dynamically in _startTocLoad based on saved progress

        // Reader sidebar
        const toggleSidebarBtn = document.getElementById("lrToggleSidebarBtn");
        if (toggleSidebarBtn) toggleSidebarBtn.addEventListener("click", () => this._toggleSidebar());

        const triggerBtn = document.getElementById("lrToggleSidebarTrigger");
        if (triggerBtn) triggerBtn.addEventListener("click", e => { e.stopPropagation(); this._toggleSidebar(); });

        // Back button
        const backBtn = document.getElementById("lrBackToDetailsBtn");
        if (backBtn) backBtn.addEventListener("click", () => {
            this._stopTTS();
            this._showView("bookDetailsView");
        });

        const backToHomeBtn = document.getElementById("lrBackToHomeBtn");
        if (backToHomeBtn) backToHomeBtn.addEventListener("click", () => {
            this._stopTTS();
            window.location.href = "../index.html";
        });

        // Settings dropdown
        const settingsBtn = document.getElementById("lrSettingsBtn");
        const dropdown = document.getElementById("lrSettingsDropdown");
        if (settingsBtn && dropdown) {
            settingsBtn.addEventListener("click", e => { e.stopPropagation(); dropdown.classList.toggle("active"); });
            document.addEventListener("click", () => dropdown.classList.remove("active"));
            dropdown.addEventListener("click", e => e.stopPropagation());
        }

        // Theme buttons
        document.querySelectorAll(".lr-theme-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this.theme = btn.dataset.theme;
                this._applyReaderTheme();
            });
        });

        // Font select
        const fontSelect = document.getElementById("lrFontSelect");
        if (fontSelect) fontSelect.addEventListener("change", e => this._applyFont(e.target.value));

        // Font size
        const fontDec = document.getElementById("lrFontSizeDec");
        const fontInc = document.getElementById("lrFontSizeInc");
        if (fontDec) fontDec.addEventListener("click", () => this._applyFontSize(Math.max(60, this.fontSize - 10)));
        if (fontInc) fontInc.addEventListener("click", () => this._applyFontSize(Math.min(200, this.fontSize + 10)));

        // TTS
        const ttsPlay = document.getElementById("lrTtsPlayBtn");
        const ttsPause = document.getElementById("lrTtsPauseBtn");
        const ttsStop = document.getElementById("lrTtsStopBtn");
        if (ttsPlay) ttsPlay.addEventListener("click", () => this._playTTS());
        if (ttsPause) ttsPause.addEventListener("click", () => this._pauseTTS());
        if (ttsStop) ttsStop.addEventListener("click", () => this._stopTTS());

        // TTS Event Delegation and Scroll Detection
        const contentBody = document.getElementById("lrContentBody");
        if (contentBody) {
            contentBody.addEventListener("click", (e) => {
                if (!this.ttsActive) return;
                const p = e.target.closest("p, h1, h2, h3, blockquote, li");
                if (p) {
                    this._prepareTTSParagraphs();
                    const idx = this.ttsParagraphs.indexOf(p);
                    if (idx !== -1) {
                        this.ttsCurrentIndex = idx;
                        this.ttsAutoScroll = true; // resume auto-scroll on manual jump
                        this._speakParagraph(this.ttsCurrentIndex);
                    }
                }
            });
        }
        
        const mainReader = document.getElementById("lrReaderMain");
        if (mainReader) {
            const disableAutoScroll = () => {
                if (this.ttsActive) this.ttsAutoScroll = false;
            };
            mainReader.addEventListener("wheel", disableAutoScroll, { passive: true });
            mainReader.addEventListener("touchmove", disableAutoScroll, { passive: true });
            mainReader.addEventListener("keydown", (e) => {
                if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " "].includes(e.key)) {
                    disableAutoScroll();
                }
            }, { passive: true });
        }

        // Proxy config
        const proxySelect = document.getElementById("lrCorsProxySelect");
        const proxyInput = document.getElementById("lrCorsProxyInput");
        const proxyEnable = document.getElementById("lrEnableCorsProxy");
        if (proxySelect && typeof HttpClient !== "undefined") {
            proxySelect.innerHTML = "";
            HttpClient.CORS_PROXIES.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.url;
                opt.textContent = p.name;
                proxySelect.appendChild(opt);
            });
            const optCustom = document.createElement("option");
            optCustom.value = "custom";
            optCustom.textContent = "Custom...";
            proxySelect.appendChild(optCustom);
            const isKnown = HttpClient.CORS_PROXIES.find(p => p.url === HttpClient.corsProxyUrl);
            if (isKnown) {
                proxySelect.value = HttpClient.corsProxyUrl;
                if (proxyInput) { proxyInput.style.display = "none"; proxyInput.value = HttpClient.corsProxyUrl; }
            } else {
                proxySelect.value = "custom";
                if (proxyInput) { proxyInput.style.display = "block"; proxyInput.value = HttpClient.corsProxyUrl; }
            }
            if (proxyEnable) proxyEnable.checked = HttpClient.enableCorsProxy;
            proxySelect.addEventListener("change", () => {
                if (proxySelect.value === "custom") {
                    if (proxyInput) { proxyInput.style.display = "block"; HttpClient.corsProxyUrl = proxyInput.value; }
                } else {
                    if (proxyInput) { proxyInput.style.display = "none"; proxyInput.value = proxySelect.value; }
                    HttpClient.corsProxyUrl = proxySelect.value;
                }
                HttpClient.enableCorsProxy = true;
                if (proxyEnable) proxyEnable.checked = true;
            });
            if (proxyInput) proxyInput.addEventListener("change", () => { HttpClient.corsProxyUrl = proxyInput.value; });
            if (proxyEnable) proxyEnable.addEventListener("change", () => { HttpClient.enableCorsProxy = proxyEnable.checked; });
        }
    }

    _onUrlSubmit() {
        const input = document.getElementById("lrUrlInput");
        if (!input) return;
        const url = input.value.trim();
        if (!url) return;
        const fullUrl = /^https?:\/\//i.test(url) ? url : "https://" + url;
        this._showView("bookLoadingView");
        this._loadBookDetails(fullUrl);
    }

    // ─────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────
    _withTimeout(promise, ms, message) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error(message)), ms);
            promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
        });
    }

    _saveProgress(idx) {
        if (!this.userPrefs || !this.userPrefs.readingList || !this.url || !this.toc) return;
        if (idx < 0 || idx >= this.toc.length) return;
        let chap = this.toc[idx];
        if (chap && chap.sourceUrl) {
            this.userPrefs.readingList.setEpub(this.url, chap.sourceUrl);
        }
    }

    async _saveBookToLibrary() {
        if (!this.url || !this.metaInfo.title) return;
        const id = this.url;
        
        try {
            let storageData = await new Promise(r => chrome.storage.local.get("LibArray", r));
            let libArray = storageData.LibArray || [];
            if (!libArray.includes(id)) {
                libArray.push(id);
            }

            let updateData = {
                "LibArray": libArray,
                [`LibEpub${id}`]: `lazy:liveread:${this.url}`,
                [`LibFilename${id}`]: "livebook.html",
                [`LibCover${id}`]: this.metaInfo.coverUrl || "",
                [`LibStoryURL${id}`]: this.url,
                [`LibTitle${id}`]: this.metaInfo.title || "Live Book",
                [`LibAuthor${id}`]: this.metaInfo.author || "Unknown",
                [`LibDesc${id}`]: this.metaInfo.description || "",
                [`LibProgress${id}`]: 0
            };
            await new Promise(r => chrome.storage.local.set(updateData, () => r()));
            alert("Book added to Personal Library successfully!");
        } catch (e) {
            alert("Failed to add book to Personal Library: " + e.message);
        }
    }

    async _fetchChapterHtmlDirectly(href) {
        if (this.fastLoadPromise) return this.fastLoadPromise;
        this.fastLoadPromise = (async () => {
            let doc = null;
            if (this.parser && typeof this.parser.fetchChapter === "function") {
                try { doc = await this.parser.fetchChapter(href); } catch (_) {}
            }
            if (!doc) {
                let xhr = await HttpClient.wrapFetch(href);
                doc = xhr?.responseXML;
                if (!doc && xhr?.responseText) {
                    doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
                }
            }
            if (!doc) throw new Error("Failed to load chapter from server");

            const contentEl = this._extractChapterContent(doc, href);
            let html = contentEl ? contentEl.innerHTML : (doc.body ? doc.body.innerHTML : "");

            const temp = document.createElement("div");
            temp.innerHTML = html;
            temp.querySelectorAll("script,style,iframe,select,input,button,noscript,nav,header,footer,[class*='ad'],[id*='ad']").forEach(el => el.remove());
            return temp.innerHTML;
        })();
        return this.fastLoadPromise;
    }
}
