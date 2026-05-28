/* EPUB Viewer Engine and Interface Controller */
"use strict";

class EpubViewerUI {
    constructor() {
        this.currentZipReader = null;
        this.entries = [];
        this.opfEntry = null;
        this.opfDir = "";
        this.spineItems = [];
        this.toc = [];
        this.currentChapterIndex = 0;
        this.currentPage = 0;
        this.totalPages = 1;
        this.theme = "dark";
        this.layout = "scroll"; // "scroll" or "page-turn"
        this.font = "sans"; // "sans", "serif", "mono", "dyslexic"
        this.voices = [];
        this.selectedVoiceURI = "";
        
        // Continuous Scroll state variables
        this.isChapterLoading = false;
        this.loadedChaptersIndex = 0;
        this.observer = null;
        
        // TTS state
        this.ttsActive = false;
        this.ttsParagraphs = [];
        this.ttsCurrentIndex = 0;
        this.speechUtterance = null;
        
        this.metaInfo = { title: "", author: "", coverDataUrl: "" };

        // Advanced display states
        this.fontSize = 100; // font size percentage (60 to 200)
        this.headerHidden = false; // header hidden state
        this.lazyParser = null;
        this.lazyUserPreferences = null;
        this.lazyPrefetchCount = 0;
        this.activeLoadRequestId = 0;
    }

    init() {
        // Configure zip.js globally to not use web workers (critical for mobile webviews and extensions)
        if (typeof zip !== "undefined") {
            if (zip.configure) {
                zip.configure({ useWebWorkers: false });
            } else {
                zip.useWebWorkers = false;
            }
        }

        this.bindEvents();
        // Set default theme on reader
        const readerMain = document.getElementById("epubReaderMain");
        if (readerMain) {
            readerMain.className = `theme-${this.theme}`;
        }
        
        // Force initial layout and font configurations to fix scrolling and load defaults
        this.setLayout(this.layout);
        this.setFont(this.font);

        // Load initial font size and header visibility from localStorage
        const savedFontSize = localStorage.getItem("epub-reader-font-size");
        this.fontSize = savedFontSize ? parseInt(savedFontSize, 10) : 100;
        this.setFontSize(this.fontSize);

        const savedHeaderHidden = localStorage.getItem("epub-reader-header-hidden");
        this.headerHidden = savedHeaderHidden === "true";
        this.setHeaderHidden(this.headerHidden);
        
        // Initialize IntersectionObserver for tracking active chapter during scroll
        this.initIntersectionObserver();
        
        // Populate Speech Synthesis Voice list
        this.initVoices();

        // Collapse sidebar by default on mobile screens
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById("epubReaderSidebar");
            if (sidebar) {
                sidebar.classList.add("collapsed");
            }
        }
    }

    prefersInstantScroll() {
        return window.innerWidth <= 768;
    }

    bindEvents() {
        // Toggle Sidebar
        const toggleSidebarBtn = document.getElementById("readerToggleSidebar");
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener("click", () => this.toggleSidebar());
        }

        const triggerBtn = document.getElementById("readerToggleSidebarTrigger");
        if (triggerBtn) {
            triggerBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggleSidebar();
            });
        }

        const overlay = document.getElementById("epubReaderSidebarOverlay");
        if (overlay) {
            overlay.addEventListener("click", () => {
                this.closeSidebarOnMobile();
            });
        }

        // Toggle Settings Dropdown
        const settingsBtn = document.getElementById("readerSettingsBtn");
        const dropdown = document.getElementById("readerControlsDropdown");
        if (settingsBtn && dropdown) {
            settingsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("active");
            });
            document.addEventListener("click", () => {
                dropdown.classList.remove("active");
            });
            dropdown.addEventListener("click", (e) => e.stopPropagation());
        }

        // Theme Selector Buttons
        document.querySelectorAll(".theme-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const selectedTheme = e.currentTarget.dataset.theme;
                this.setTheme(selectedTheme);
            });
        });

        // Layout Selector Buttons
        document.querySelectorAll(".layout-btn").forEach(btn => {
            if (btn.id !== "readerImmersiveBtn") {
                btn.addEventListener("click", (e) => {
                    const selectedLayout = e.currentTarget.dataset.layout;
                    this.setLayout(selectedLayout);
                });
            }
        });

        // Font Face Select Selector
        const fontSelect = document.getElementById("readerFontSelect");
        if (fontSelect) {
            fontSelect.addEventListener("change", (e) => {
                this.setFont(e.target.value);
            });
        }

        // Immersive Mode buttons
        const immersiveBtn = document.getElementById("readerImmersiveBtn");
        const exitImmersiveBtn = document.getElementById("readerExitImmersiveBtn");
        if (immersiveBtn) {
            immersiveBtn.addEventListener("click", () => this.setImmersive(true));
        }
        if (exitImmersiveBtn) {
            exitImmersiveBtn.addEventListener("click", () => this.setImmersive(false));
        }

        // File Uploader inside Reader
        const fileInput = document.getElementById("epubReaderUploadInput");
        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadEpub(file);
                }
            });
        }

        // Horizontal Page Turn Navigation
        const prevArrow = document.getElementById("readerPrevPage");
        const nextArrow = document.getElementById("readerNextPage");
        if (prevArrow && nextArrow) {
            prevArrow.addEventListener("click", () => this.navigatePage(-1));
            nextArrow.addEventListener("click", () => this.navigatePage(1));
        }

        // Keyboard navigation for page-turn mode
        document.addEventListener("keydown", (e) => {
            if (document.getElementById("epubReaderMain").style.display === "none") return;
            if (this.layout === "page-turn") {
                if (e.key === "ArrowLeft") this.navigatePage(-1);
                if (e.key === "ArrowRight") this.navigatePage(1);
            }
        });

        // TTS Controls
        const ttsPlay = document.getElementById("ttsPlayBtn");
        const ttsPause = document.getElementById("ttsPauseBtn");
        const ttsStop = document.getElementById("ttsStopBtn");
        if (ttsPlay && ttsPause && ttsStop) {
            ttsPlay.addEventListener("click", () => this.playTTS());
            ttsPause.addEventListener("click", () => this.pauseTTS());
            ttsStop.addEventListener("click", () => this.stopTTS());
        }

        // Recalculate pages on resize
        window.addEventListener("resize", () => {
            if (this.layout === "page-turn") {
                this.updatePageTurnMetrics();
            }
        });

        // Continuous scroll next-chapter loader: governed completely by lazyLoadObserver now.
        const viewport = document.getElementById("epubReaderViewport");
        if (viewport) {
            viewport.addEventListener("scroll", () => {
                // Dual IntersectionObservers handle elegant skeleton loading
            }, { passive: true });

            // Tap margins of the viewport in page-turn mode to navigate pages
            viewport.addEventListener("click", (e) => {
                // Auto-close sidebar on mobile if open and user taps outside it
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById("epubReaderSidebar");
                    if (sidebar && !sidebar.classList.contains("collapsed")) {
                        this.closeSidebarOnMobile();
                        e.stopPropagation();
                        e.preventDefault();
                        return;
                    }
                }

                if (this.layout !== "page-turn") return;
                
                // Do not page turn if user clicked an interactive UI element
                if (e.target.closest("a, button, select, input, label, .page-nav-arrow, .reader-btn")) {
                    return;
                }
                
                const width = viewport.clientWidth;
                const clickX = e.clientX - viewport.getBoundingClientRect().left;
                
                if (clickX < width * 0.3) {
                    this.navigatePage(-1); // Turn back page
                } else if (clickX > width * 0.7) {
                    this.navigatePage(1); // Turn next page
                }
            });
        }

        // Font Size adjustment handlers
        const fontSizeDecBtn = document.getElementById("readerFontSizeDec");
        const fontSizeIncBtn = document.getElementById("readerFontSizeInc");
        if (fontSizeDecBtn && fontSizeIncBtn) {
            fontSizeDecBtn.addEventListener("click", () => {
                const newSize = Math.max(60, this.fontSize - 10);
                this.setFontSize(newSize);
                if (this.layout === "page-turn") {
                    setTimeout(() => this.updatePageTurnMetrics(), 50);
                }
            });
            fontSizeIncBtn.addEventListener("click", () => {
                const newSize = Math.min(200, this.fontSize + 10);
                this.setFontSize(newSize);
                if (this.layout === "page-turn") {
                    setTimeout(() => this.updatePageTurnMetrics(), 50);
                }
            });
        }

        // Header visibility togglers
        const toggleHeaderBtn = document.getElementById("readerToggleHeaderBtn");
        const showHeaderBtn = document.getElementById("readerShowHeaderBtn");
        if (toggleHeaderBtn) {
            toggleHeaderBtn.addEventListener("click", () => this.toggleHeader());
        }
        if (showHeaderBtn) {
            showHeaderBtn.addEventListener("click", () => this.toggleHeader());
        }

        // Keyboard Shortcut 'H' to toggle reader header
        document.addEventListener("keydown", (e) => {
            const readerMain = document.getElementById("epubReaderMain");
            if (readerMain && readerMain.style.display !== "none") {
                if (e.key.toLowerCase() === "h") {
                    // Ignore shortcut when active in textareas or input fields
                    const tag = document.activeElement.tagName;
                    if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
                        this.toggleHeader();
                    }
                }
            }
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById("epubReaderSidebar");
        const overlay = document.getElementById("epubReaderSidebarOverlay");
        if (sidebar) {
            const isCollapsed = sidebar.classList.toggle("collapsed");
            if (overlay) {
                if (isCollapsed) {
                    overlay.classList.remove("active");
                } else {
                    overlay.classList.add("active");
                }
            }
            // Allow metrics update after transition completes
            setTimeout(() => {
                if (this.layout === "page-turn") this.updatePageTurnMetrics();
            }, 350);
        }
    }

    closeSidebarOnMobile() {
        const sidebar = document.getElementById("epubReaderSidebar");
        const overlay = document.getElementById("epubReaderSidebarOverlay");
        if (sidebar && window.innerWidth <= 768) {
            if (!sidebar.classList.contains("collapsed")) {
                sidebar.classList.add("collapsed");
                if (overlay) {
                    overlay.classList.remove("active");
                }
                setTimeout(() => {
                    if (this.layout === "page-turn") this.updatePageTurnMetrics();
                }, 350);
            }
        }
    }

    resetBookState() {
        this.stopTTS();
        this.entries = [];
        this.opfEntry = null;
        this.opfDir = "";
        this.spineItems = [];
        this.toc = [];
        this.currentChapterIndex = -1;
        this.currentPage = 0;
        this.totalPages = 1;
        this.loadedChaptersIndex = 0;
        this.isChapterLoading = false;

        this.lazyNovelUrl = null;
        this.lazyParser = null;
        this.lazyUserPreferences = null;
        this.lazyCache = new Map();
        this.lazyLoadingQueue = new Set();
        this.lazyPromiseMap = new Map();

        this.metaInfo = { title: "", author: "", coverDataUrl: "" };

        let tocList = document.getElementById("readerTocList");
        if (tocList) {
            tocList.innerHTML = "";
        }

        let contentBody = document.getElementById("epubReaderContentBody");
        if (contentBody) {
            contentBody.innerHTML = "";
        }

        let chapterName = document.getElementById("readerCurrentChapterName");
        if (chapterName) {
            chapterName.textContent = "Loading...";
        }

        let pageNum = document.getElementById("readerPageNum");
        if (pageNum) {
            pageNum.textContent = "";
        }
    }

    setTheme(selectedTheme) {
        this.theme = selectedTheme;
        const readerMain = document.getElementById("epubReaderMain");
        if (readerMain) {
            // Retain font and immersive modes while switching themes
            const classes = Array.from(readerMain.classList).filter(c => c.startsWith("font-") || c === "immersive-reading");
            readerMain.className = `theme-${selectedTheme} ${classes.join(" ")}`;
        }
        document.querySelectorAll(".theme-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.theme === selectedTheme);
        });
    }

    setLayout(selectedLayout) {
        this.layout = selectedLayout;
        const viewport = document.getElementById("epubReaderViewport");
        if (viewport) {
            viewport.className = selectedLayout === "page-turn" ? "page-turn-mode" : "";
            document.getElementById("epubReaderContentBody").style.transform = "";
            viewport.scrollTop = 0; // Reset scroll position
        }
        document.querySelectorAll(".layout-btn").forEach(btn => {
            if (btn.id !== "readerImmersiveBtn") {
                btn.classList.toggle("active", btn.dataset.layout === selectedLayout);
            }
        });

        this.currentPage = 0;
        
        // Re-initialize observers
        this.initIntersectionObserver();
        
        // Dynamic re-render on layout shift to layout metrics correctly
        if (this.entries.length > 0 || this.isLazyScraped) {
            if (selectedLayout === "scroll") {
                this.initializeScrollViewport();
                if (this.currentChapterIndex === -1) {
                    const cover = document.getElementById("chapter-wrap-cover");
                    if (cover) cover.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "start" });
                } else {
                    const wrapper = document.getElementById(`chapter-wrap-${this.currentChapterIndex}`);
                    if (wrapper) {
                        wrapper.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "start" });
                        this.lazyLoadChapter(this.currentChapterIndex);
                    }
                }
            } else {
                if (this.currentChapterIndex === -1) {
                    this.renderCoverPage();
                } else {
                    this.loadChapter(this.currentChapterIndex);
                }
            }
        }
    }

    setFont(fontFace) {
        this.font = fontFace;
        const readerMain = document.getElementById("epubReaderMain");
        if (readerMain) {
            readerMain.classList.remove("font-sans", "font-serif", "font-mono", "font-dyslexic");
            readerMain.classList.add(`font-${fontFace}`);
        }
        const fontSelect = document.getElementById("readerFontSelect");
        if (fontSelect) {
            fontSelect.value = fontFace;
        }
    }

    setImmersive(active) {
        const readerMain = document.getElementById("epubReaderMain");
        const exitBtn = document.getElementById("readerExitImmersiveBtn");
        const showHeaderBtn = document.getElementById("readerShowHeaderBtn");
        if (readerMain) {
            readerMain.classList.toggle("immersive-reading", active);
        }
        if (exitBtn) {
            exitBtn.style.display = active ? "flex" : "none";
        }

        // Hide restore header button in full immersive mode
        if (showHeaderBtn) {
            showHeaderBtn.style.display = (!active && this.headerHidden) ? "flex" : "none";
        }
        
        // Auto collapse sidebar in immersive mode
        const sidebar = document.getElementById("epubReaderSidebar");
        if (active && sidebar && !sidebar.classList.contains("collapsed")) {
            this.toggleSidebar();
        }
        
        // Hide option dropdown
        const dropdown = document.getElementById("readerControlsDropdown");
        if (dropdown) dropdown.classList.remove("active");

        if (this.layout === "page-turn") {
            setTimeout(() => this.updatePageTurnMetrics(), 100);
        }
    }

    setFontSize(size) {
        this.fontSize = size;
        const readerMain = document.getElementById("epubReaderMain");
        if (readerMain) {
            readerMain.style.setProperty("--reader-font-size", `${(size / 100) * 1.15}rem`);
        }
        const display = document.getElementById("readerFontSizeDisplay");
        if (display) {
            display.textContent = `${size}%`;
        }
        localStorage.setItem("epub-reader-font-size", size);
    }

    setHeaderHidden(hidden) {
        this.headerHidden = hidden;
        const readerMain = document.getElementById("epubReaderMain");
        const toggleHeaderBtn = document.getElementById("readerToggleHeaderBtn");
        const showHeaderBtn = document.getElementById("readerShowHeaderBtn");

        if (readerMain) {
            readerMain.classList.toggle("header-hidden", hidden);
        }

        if (toggleHeaderBtn) {
            toggleHeaderBtn.textContent = hidden ? "Show Header Bar" : "Hide Header Bar";
            toggleHeaderBtn.innerHTML = hidden ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Show Header Bar
            ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> Hide Header Bar
            `;
        }

        // Show floating header restore button only if hidden and not in fullscreen mode
        const inImmersiveMode = readerMain && readerMain.classList.contains("immersive-reading");
        if (showHeaderBtn) {
            showHeaderBtn.style.display = (hidden && !inImmersiveMode) ? "flex" : "none";
        }

        localStorage.setItem("epub-reader-header-hidden", hidden);

        // Hide option dropdown
        const dropdown = document.getElementById("readerControlsDropdown");
        if (dropdown) dropdown.classList.remove("active");

        if (this.layout === "page-turn") {
            setTimeout(() => this.updatePageTurnMetrics(), 50);
        }
    }

    toggleHeader() {
        this.setHeaderHidden(!this.headerHidden);
    }

    initVoices() {
        const voiceSelect = document.getElementById("ttsVoiceSelect");
        if (!voiceSelect) return;

        const populate = () => {
            this.voices = window.speechSynthesis.getVoices();
            // Fill selector
            voiceSelect.innerHTML = "<option value=\"\">Default Voice</option>";
            this.voices.forEach(voice => {
                const option = document.createElement("option");
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.voiceURI === this.selectedVoiceURI) {
                    option.selected = true;
                }
                voiceSelect.appendChild(option);
            });
        };

        populate();
        if (typeof window.speechSynthesis !== "undefined" && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populate;
        }

        voiceSelect.addEventListener("change", (e) => {
            this.selectedVoiceURI = e.target.value;
        });
    }

    initIntersectionObserver() {
        if (this.observer) this.observer.disconnect();
        if (this.lazyLoadObserver) this.lazyLoadObserver.disconnect();

        // 1. Observer for updating active chapter header & TOC highlights
        const activeOptions = {
            root: document.getElementById("epubReaderViewport"),
            rootMargin: "0px 0px -50% 0px", // Trigger active chapter update when it crosses upper mid section
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = parseInt(entry.target.dataset.index);
                    const title = entry.target.dataset.title;

                    this.currentChapterIndex = idx;
                    document.getElementById("readerCurrentChapterName").textContent = title;
                    if (idx === -1) {
                        document.getElementById("readerPageNum").textContent = "Book Cover";
                    } else {
                        document.getElementById("readerPageNum").textContent = `Chapter ${idx + 1}/${this.toc.length}`;
                    }
                    this.updateActiveTocHighlight();
                }
            });
        }, activeOptions);

        // 2. Observer for prefetching and lazy loading chapter placeholders early
        const lazyOptions = {
            root: document.getElementById("epubReaderViewport"),
            rootMargin: this.prefersInstantScroll() ? "350px 0px 350px 0px" : "1000px 0px 1000px 0px", // Trigger early loading when scrolling towards it
            threshold: 0
        };

        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            if (this.isNavigatingToChapter) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = parseInt(entry.target.dataset.index);
                    if (idx >= 0 && entry.target.classList.contains("placeholder-loading")) {
                        this.lazyLoadChapter(idx);
                    }
                }
            });
        }, lazyOptions);
    }

    // Re-observe placeholders near current scroll position so the observer fires for them
    _reobservePlaceholders() {
        if (!this.lazyLoadObserver) return;
        const wrappers = document.querySelectorAll(".continuous-chapter-wrapper.placeholder-loading");
        wrappers.forEach(w => {
            this.lazyLoadObserver.unobserve(w);
            this.lazyLoadObserver.observe(w);
        });
    }

    initializeScrollViewport() {
        const contentBody = document.getElementById("epubReaderContentBody");
        if (!contentBody) return;
        contentBody.innerHTML = "";

        // Inject skeleton shimmer animation style
        const styleId = "reader-skeleton-style";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                @keyframes skeleton-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .continuous-chapter-wrapper.placeholder-loading {
                    opacity: 0.7;
                    transition: opacity 0.5s ease;
                }
                .continuous-chapter-wrapper.loaded {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }

        // 1. Render Cover Page at dataset index -1
        const coverSrc = this.metaInfo.coverDataUrl || "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNjAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMWExZjtkc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsiPgo8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzFhMWExZifvPgo8dGV4dCB4PSI1MCUiIHk9IjMwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OT1ZFTCBSRUFERVI8L3RleHQ+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjMDBmNWZmIiBmb250LXNpemU9IjI4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRleHQtZGVjb3JhdGlvbj0idW5kZXJsaW5lIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";
        const coverWrapper = document.createElement("div");
        coverWrapper.className = "continuous-chapter-wrapper";
        coverWrapper.dataset.index = -1;
        coverWrapper.dataset.title = "Book Cover";
        coverWrapper.id = "chapter-wrap-cover";
        coverWrapper.innerHTML = `
            <div class="reader-cover-container" style="min-height: calc(100vh - 120px); margin-bottom: 60px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; width:100%; max-width:100%; overflow:hidden;">
                <img class="reader-cover-img" src="${coverSrc}" alt="Book Cover" style="max-height:60vh; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.4); margin-bottom:24px; max-width:100%;">
                <h1 class="reader-cover-title" style="font-weight:700; margin-bottom:8px;">${this.metaInfo.title || "Live Novel"}</h1>
                <div class="reader-cover-author" style="font-size:1.25rem; color:var(--reader-muted);">${this.isLazyScraped ? "Source:" : "By"} ${this.metaInfo.author || "Unknown Author"}</div>
                <div style="margin-top: 30px; color: var(--primary, #00f5ff); font-weight: 700; font-size: 0.95rem; letter-spacing: 0.05em;">
                    SCROLL DOWN TO START READING ↓
                </div>
            </div>
        `;
        contentBody.appendChild(coverWrapper);
        if (this.observer) this.observer.observe(coverWrapper);

        // 2. Render all chapter placeholders in order
        this.toc.forEach((chapter, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "continuous-chapter-wrapper placeholder-loading";
            wrapper.dataset.index = index;
            wrapper.dataset.title = chapter.title;
            wrapper.id = `chapter-wrap-${index}`;
            
            wrapper.innerHTML = `
                <div class="chapter-scroll-divider" style="margin-top:40px; margin-bottom:30px; border-bottom: 1px solid var(--reader-border); padding-bottom: 10px;">
                    <span style="font-weight:700; color:var(--primary, #00f5ff);">${chapter.title}</span>
                </div>
                <div class="chapter-skeleton-container" style="padding: 20px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); margin-bottom: 50px;">
                    <div class="skeleton-line" style="height: 18px; width: 40%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 4px; margin-bottom: 16px;"></div>
                    <div class="skeleton-line" style="height: 14px; width: 90%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 4px; margin-bottom: 12px;"></div>
                    <div class="skeleton-line" style="height: 14px; width: 85%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 4px; margin-bottom: 12px;"></div>
                    <div class="skeleton-line" style="height: 14px; width: 88%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 4px; margin-bottom: 24px;"></div>
                    
                    <div style="display:flex; justify-content:center; margin-top:20px;">
                        <button class="reader-load-btn" data-index="${index}" style="background: rgba(0,245,255,0.1); border: 1px solid var(--primary, #00f5ff); color: var(--primary, #00f5ff); padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                            Load Chapter Now
                        </button>
                    </div>
                    <div style="margin-top: 14px; color: var(--reader-muted); font-size: 0.85rem; line-height: 1.5; word-break: break-all;">
                        Source Link: ${chapter.href}
                    </div>
                </div>
            `;
            
            contentBody.appendChild(wrapper);
            
            const loadBtn = wrapper.querySelector(".reader-load-btn");
            if (loadBtn) {
                loadBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.lazyLoadChapter(index);
                });
            }

            if (this.observer) this.observer.observe(wrapper);
            if (this.lazyLoadObserver) this.lazyLoadObserver.observe(wrapper);
        });

    }

    async lazyLoadChapter(index) {
        if (index < 0 || index >= this.toc.length) return;
        const wrapper = document.getElementById(`chapter-wrap-${index}`);
        if (!wrapper || !wrapper.classList.contains("placeholder-loading")) return;

        // Avoid double loading
        if (wrapper.dataset.loading === "true") return;
        wrapper.dataset.loading = "true";

        // Change button text to "Loading..."
        const loadBtn = wrapper.querySelector(".reader-load-btn");
        if (loadBtn) {
            loadBtn.textContent = "Loading Chapter...";
            loadBtn.disabled = true;
        }

        try {
            // Measure original placeholder height and offset before content replacement
            const oldHeight = wrapper.offsetHeight;
            const oldOffsetTop = wrapper.offsetTop;

            let xhtmlText = "";
            if (this.isLazyScraped) {
                // Remote scraped chapter
                if (!this.lazyCache.has(index)) {
                    await this.loadLazyChapterIntoCache(index);
                }
                xhtmlText = this.lazyCache.get(index);
                if (!xhtmlText) {
                    throw new Error("Failed to load chapter content from source link.");
                }
            } else {
                // Local EPUB file chapter
                const chapter = this.toc[index];
                const chapterEntry = this.entries.find(e => e.filename === chapter.href || decodeURIComponent(e.filename) === decodeURIComponent(chapter.href));
                if (chapterEntry) {
                    xhtmlText = await chapterEntry.getData(new zip.TextWriter());
                    xhtmlText = await this.resolveChapterImages(xhtmlText, chapter.href);
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(xhtmlText, "text/html");
                    doc.querySelectorAll("style, script, link[rel='stylesheet']").forEach(el => el.remove());
                    xhtmlText = doc.body ? doc.body.innerHTML : xhtmlText;
                } else {
                    xhtmlText = "<p>Chapter file not found inside EPUB archive.</p>";
                }
            }

            // Replace placeholder content with real content
            wrapper.innerHTML = `
                <div class="chapter-scroll-divider" style="margin-top:40px; margin-bottom:30px; border-bottom: 1px solid var(--reader-border); padding-bottom: 10px;">
                    <span style="font-weight:700; color:var(--primary, #00f5ff);">${this.toc[index].title}</span>
                </div>
                <div class="chapter-content-body">
                    ${xhtmlText}
                </div>
            `;
            // Clean up styling attributes from children (excluding images)
            wrapper.querySelectorAll(".chapter-content-body *").forEach(el => {
                if (el.tagName && !el.tagName.toLowerCase().includes("img")) {
                    el.removeAttribute("style");
                }
            });

            wrapper.className = "continuous-chapter-wrapper loaded";
            wrapper.removeAttribute("data-loading");

            // Measure new loaded height and compensate viewport scroll top to prevent layout shifts
            const newHeight = wrapper.offsetHeight;
            const heightDiff = newHeight - oldHeight;
            const viewport = document.getElementById("epubReaderViewport");
            if (viewport && heightDiff > 0) {
                // If the entire loaded chapter was completely above the current scroll viewport view
                if (oldOffsetTop + oldHeight <= viewport.scrollTop) {
                    viewport.scrollTop += heightDiff;
                }
            }

            // Re-prepare TTS paragraphs to include newly loaded ones, preserving active TTS index
            const activeTtsIndex = this.ttsCurrentIndex;
            this.prepareTTSParagraphs();
            this.ttsCurrentIndex = activeTtsIndex;
        } catch (err) {
            console.error(`Failed to lazy load chapter ${index}:`, err);
            if (loadBtn) {
                loadBtn.textContent = "Retry Loading";
                loadBtn.disabled = false;
                
                // Add a small styled warning inside the skeleton container so the user sees the error
                const skeletonContainer = wrapper.querySelector(".chapter-skeleton-container");
                if (skeletonContainer) {
                    let errMsgEl = skeletonContainer.querySelector(".loading-error-message");
                    if (!errMsgEl) {
                        errMsgEl = document.createElement("div");
                        errMsgEl.className = "loading-error-message";
                        errMsgEl.style.cssText = "color: #ff5252; margin-top: 14px; text-align: center; font-size: 0.9rem; font-weight: 500; border-top: 1px solid rgba(255, 82, 82, 0.2); padding-top: 10px;";
                        skeletonContainer.appendChild(errMsgEl);
                    }
                    errMsgEl.textContent = "Fetch Failed: Check your network/proxy connection.";
                }
            }
            wrapper.removeAttribute("data-loading");
        }
    }

    async appendNextChapter() {
        if (this.isChapterLoading || this.loadedChaptersIndex >= this.toc.length - 1) return;
        this.isChapterLoading = true;

        if (this.isLazyScraped) {
            await this.appendNextLazyChapter();
            return;
        }

        const nextIndex = this.loadedChaptersIndex + 1;
        const chapter = this.toc[nextIndex];
        const chapterEntry = this.entries.find(e => e.filename === chapter.href);

        if (!chapterEntry) {
            this.isChapterLoading = false;
            return;
        }

        try {
            let xhtmlText = await chapterEntry.getData(new zip.TextWriter());
            xhtmlText = await this.resolveChapterImages(xhtmlText, chapter.href);

            const parser = new DOMParser();
            const doc = parser.parseFromString(xhtmlText, "text/html");
            doc.querySelectorAll("style, script, link[rel='stylesheet']").forEach(el => el.remove());

            const contentBody = document.getElementById("epubReaderContentBody");

            // Create wrapper
            const wrapper = document.createElement("div");
            wrapper.className = "continuous-chapter-wrapper";
            wrapper.dataset.index = nextIndex;
            wrapper.dataset.title = chapter.title;
            wrapper.id = `chapter-wrap-${nextIndex}`;

            // Elegant chapter scroll divider
            wrapper.innerHTML = `
                <div class="chapter-scroll-divider">
                    <span>${chapter.title}</span>
                </div>
                <div class="chapter-content-body">
                    ${doc.body ? doc.body.innerHTML : xhtmlText}
                </div>
            `;

            wrapper.querySelectorAll("*").forEach(el => el.removeAttribute("style"));
            contentBody.appendChild(wrapper);

            // Observe this new chapter
            if (this.observer) this.observer.observe(wrapper);

            this.loadedChaptersIndex = nextIndex;

            // Re-prepare TTS paragraphs to include newly loaded ones, preserving play index
            const activeTtsIndex = this.ttsCurrentIndex;
            this.prepareTTSParagraphs();
            this.ttsCurrentIndex = activeTtsIndex;

            this.isChapterLoading = false;
        } catch (err) {
            console.error("Failed to append next chapter: ", err);
            this.isChapterLoading = false;
        }
    }

    async loadEpub(epubSource) {
        const loadRequestId = ++this.activeLoadRequestId;
        try {
            this.resetBookState();
            this.showLoader();

            // Detect Live-Scraped dynamic novel
            if (typeof epubSource === "string" && epubSource.startsWith("lazy:")) {
                this.isLazyScraped = true;
                this.lazyNovelUrl = epubSource.substring(5);
                await this.loadLazyBook(this.lazyNovelUrl, loadRequestId);
                return;
            }
            this.isLazyScraped = false;

            let zipReaderSource;
            if (typeof epubSource === "string" && epubSource.startsWith("data:")) {
                // Decode large DataURL string into binary Blob first to prevent memory-exhaustion or hangs in mobile webviews
                const decodedBlob = this.dataUrlToBlob(epubSource);
                zipReaderSource = new zip.BlobReader(decodedBlob);
            } else if (epubSource instanceof Blob || epubSource instanceof File) {
                zipReaderSource = new zip.BlobReader(epubSource);
            } else {
                throw new Error("Unsupported epub data type.");
            }

            this.currentZipReader = new zip.ZipReader(zipReaderSource, { useWebWorkers: false });
            this.entries = await this.currentZipReader.getEntries();
            this.entries = this.entries.filter(e => !e.directory);

            // 1. Locate the .opf file
            this.opfEntry = this.entries.find(e => e.filename.endsWith(".opf"));
            if (!this.opfEntry) {
                throw new Error("Invalid EPUB: content.opf file not found.");
            }

            this.opfDir = this.opfEntry.filename.substring(0, this.opfEntry.filename.lastIndexOf("/") + 1);

            // 2. Read OPF file contents
            const opfText = await this.opfEntry.getData(new zip.TextWriter());
            const parser = new DOMParser();
            let opfDoc = parser.parseFromString(opfText, "application/xml");
            if (opfDoc.querySelector("parsererror")) {
                opfDoc = parser.parseFromString(opfText, "text/html");
            }

            // 3. Parse Metadata
            const titleEl = opfDoc.querySelector("title, [localName='title']");
            const creatorEl = opfDoc.querySelector("creator, [localName='creator']");
            this.metaInfo.title = titleEl ? titleEl.textContent : "Unknown Book";
            this.metaInfo.author = creatorEl ? creatorEl.textContent : "Unknown Author";

            // 4. Parse Spine & Manifest
            const manifestItems = {};
            opfDoc.querySelectorAll("manifest item, [localName='item']").forEach(item => {
                manifestItems[item.getAttribute("id")] = item.getAttribute("href");
            });

            this.spineItems = Array.from(opfDoc.querySelectorAll("spine itemref, [localName='itemref']")).map(itemref => {
                const idref = itemref.getAttribute("idref");
                const relativeHref = manifestItems[idref];
                return relativeHref ? this.resolveRelativePath(this.opfDir, relativeHref) : null;
            }).filter(Boolean);

            // 5. Try parsing Table of Contents (.ncx)
            this.toc = [];
            const ncxEntry = this.entries.find(e => e.filename.endsWith(".ncx"));
            if (ncxEntry) {
                try {
                    const ncxText = await ncxEntry.getData(new zip.TextWriter());
                    let ncxDoc = parser.parseFromString(ncxText, "application/xml");
                    if (ncxDoc.querySelector("parsererror")) {
                        ncxDoc = parser.parseFromString(ncxText, "text/html");
                    }
                    ncxDoc.querySelectorAll("navPoint, [localName='navPoint']").forEach(np => {
                        const labelText = np.querySelector("text, [localName='text']");
                        const contentSrc = np.querySelector("content, [localName='content']");
                        if (labelText && contentSrc) {
                            const src = contentSrc.getAttribute("src");
                            const relativeHref = src.split("#")[0];
                            const fullZipPath = this.resolveRelativePath(this.opfDir, relativeHref);
                            this.toc.push({
                                title: labelText.textContent.trim(),
                                href: fullZipPath
                            });
                        }
                    });
                } catch (err) {
                    console.warn("Failed to parse TOC NCX, falling back...", err);
                }
            }

            // Fallback: If no TOC entries found, auto-generate from Spine
            if (this.toc.length === 0) {
                this.spineItems.forEach((href, idx) => {
                    let name = href.substring(href.lastIndexOf("/") + 1).replace(/\.(xhtml|html)$/i, "");
                    name = name.replace(/^[0-9_-]+/, "").replace(/_/g, " ").trim();
                    if (!name) name = `Chapter ${idx + 1}`;
                    this.toc.push({ title: name, href: href });
                });
            }

            // 6. Attempt Cover Image Discovery
            this.metaInfo.coverDataUrl = "";
            let coverImgPath = "";
            
            // Look for cover item in manifest
            const coverItem = opfDoc.querySelector("item[properties~='cover-image'], item[id='cover'], item[id='cover-image']");
            if (coverItem) {
                coverImgPath = this.resolveRelativePath(this.opfDir, coverItem.getAttribute("href"));
            } else {
                // Fallback scan for common names
                const coverEntry = this.entries.find(e => e.filename.match(/cover\.(jpg|jpeg|png|svg)/i));
                if (coverEntry) coverImgPath = coverEntry.filename;
            }

            if (coverImgPath) {
                const coverEntry = this.entries.find(e => e.filename === coverImgPath);
                if (coverEntry) {
                    try {
                        const fileExt = coverImgPath.split(".").pop().toLowerCase();
                        const mime = `image/${fileExt === "svg" ? "svg+xml" : fileExt}`;
                        this.metaInfo.coverDataUrl = await coverEntry.getData(new zip.Data64URIWriter(mime));
                    } catch (e) {
                        console.warn("Cover image extract failed:", e);
                    }
                }
            }

            if (loadRequestId !== this.activeLoadRequestId) {
                return;
            }

            // Render Book ToC inside Sidebar
            this.renderSidebarToC();

            // Open Cover Page or First Chapter
            this.currentChapterIndex = -1; // -1 represents the Cover page view
            this.renderCoverPage();
            this.hideLoader();

        } catch (e) {
            this.hideLoader();
            alert("Error loading EPUB: " + e.message);
        }
    }

    renderSidebarToC() {
        const tocList = document.getElementById("readerTocList");
        if (!tocList) return;
        tocList.innerHTML = "";

        // Add a top "Cover Page" item
        const coverItem = document.createElement("li");
        coverItem.className = "toc-item active";
        coverItem.id = "toc-cover-item";
        coverItem.textContent = "Book Cover Page";
        coverItem.addEventListener("click", () => {
            this.currentChapterIndex = -1;
            this.renderCoverPage();
            this.updateActiveTocHighlight();
            this.closeSidebarOnMobile();
        });
        tocList.appendChild(coverItem);

        this.toc.forEach((item, index) => {
            const li = document.createElement("li");
            li.className = "toc-item";
            li.textContent = item.title;
            li.dataset.index = index;
            if (item.href) {
                li.title = item.href;
            }
            li.addEventListener("click", () => {
                this.loadChapter(index);
                this.closeSidebarOnMobile();
            });
            tocList.appendChild(li);
        });
    }

    updateActiveTocHighlight() {
        document.querySelectorAll(".toc-item").forEach(item => {
            item.classList.remove("active");
        });
        if (this.currentChapterIndex === -1) {
            const coverItem = document.getElementById("toc-cover-item");
            if (coverItem) coverItem.classList.add("active");
        } else {
            const activeItem = document.querySelector(`.toc-item[data-index="${this.currentChapterIndex}"]`);
            if (activeItem) activeItem.classList.add("active");
        }
    }

    renderCoverPage() {
        this.stopTTS();
        
        if (this.layout === "scroll" && this.toc.length > 0) {
            const firstChapterWrap = document.getElementById("chapter-wrap-0");
            if (!firstChapterWrap) {
                this.initializeScrollViewport();
            }
            const coverWrapper = document.getElementById("chapter-wrap-cover");
            if (coverWrapper) {
                this.isNavigatingToChapter = true;
                if (this.navigationTimeout) clearTimeout(this.navigationTimeout);
                coverWrapper.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "start" });
                this.navigationTimeout = setTimeout(() => {
                    this.isNavigatingToChapter = false;
                    this._reobservePlaceholders();
                }, 800);
            }
            this.currentChapterIndex = -1;
            this.updateActiveTocHighlight();
            return;
        }

        const contentBody = document.getElementById("epubReaderContentBody");
        if (!contentBody) return;

        this.currentPage = 0;
        this.totalPages = 1;
        document.getElementById("epubReaderContentBody").style.transform = "";

        const coverSrc = this.metaInfo.coverDataUrl || "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNjAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMWExZjtkc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsiPgo8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzFhMWExZiIvPgo8dGV4dCB4PSI1MCUiIHk9IjMwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OT1ZFTCBSRUFERVI8L3RleHQ+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjMDBmNWZmIiBmb250LXNpemU9IjI4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRleHQtZGVjb3JhdGlvbj0idW5kZXJsaW5lIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";

        contentBody.innerHTML = `
            <div class="reader-cover-container">
                <img class="reader-cover-img" src="${coverSrc}" alt="Book Cover">
                <h1 class="reader-cover-title">${this.metaInfo.title || "EPUB Ebook"}</h1>
                <div class="reader-cover-author">By ${this.metaInfo.author || "Unknown Author"}</div>
                <div style="margin-top: 36px;">
                    <button id="readerStartBtn" class="import-btn" style="padding: 14px 40px; font-size: 1.1rem; border-radius: 30px; cursor: pointer;">
                        Start Reading →
                    </button>
                </div>
            </div>
        `;

        const startBtn = document.getElementById("readerStartBtn");
        if (startBtn) {
            startBtn.addEventListener("click", () => {
                this.loadChapter(0);
            });
        }

        document.getElementById("readerCurrentChapterName").textContent = "Cover Page";
        document.getElementById("readerPageNum").textContent = "Cover";
        this.updateActiveTocHighlight();

        if (this.layout === "page-turn") {
            setTimeout(() => this.updatePageTurnMetrics(), 50);
        }
    }

    async loadChapter(index) {
        if (index < 0 || index >= this.toc.length) return;
        this.stopTTS();

        if (this.layout === "scroll") {
            this.currentChapterIndex = index;
            
            // Check if scroll viewport is already initialized (has wrappers)
            const firstChapterWrap = document.getElementById("chapter-wrap-0");
            if (!firstChapterWrap) {
                this.showLoader();
                this.initializeScrollViewport();
                this.hideLoader();
            }

            // Scroll the target chapter placeholder into view smoothly
            const wrapper = document.getElementById(`chapter-wrap-${index}`);
            if (wrapper) {
                this.isNavigatingToChapter = true;
                if (this.navigationTimeout) clearTimeout(this.navigationTimeout);

                wrapper.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "start" });
                
                // Force immediate lazy load of target chapter so user doesn't wait
                if (wrapper.classList.contains("placeholder-loading")) {
                    await this.lazyLoadChapter(index);
                }

                this.navigationTimeout = setTimeout(() => {
                    this.isNavigatingToChapter = false;
                    this._reobservePlaceholders();
                }, 800);
            }
            this.currentChapterIndex = -1;
            this.updateActiveTocHighlight();
            return;
        }

        // --- PAGE-TURN MODE (LOAD SINGLE ISOLATED CHAPTER) ---
        this.showLoader();

        if (this.isLazyScraped) {
            await this.loadLazyChapter(index);
            return;
        }

        this.currentChapterIndex = index;
        this.loadedChaptersIndex = index; // track the furthest loaded chapter in the viewport
        this.currentPage = 0;
        document.getElementById("epubReaderContentBody").style.transform = "";

        // Disconnect all existing observed elements
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.disconnect();
        }

        const chapter = this.toc[index];
        const chapterEntry = this.entries.find(e => e.filename === chapter.href);

        if (!chapterEntry) {
            this.hideLoader();
            alert("Chapter file not found inside EPUB archive.");
            return;
        }

        try {
            let xhtmlText = await chapterEntry.getData(new zip.TextWriter());
            
            // Replace relative image references inside the chapter XHTML with Base64 content
            xhtmlText = await this.resolveChapterImages(xhtmlText, chapter.href);

            const parser = new DOMParser();
            const doc = parser.parseFromString(xhtmlText, "text/html");
            
            // Clean up styles or scripts inside the chapter so they don't break our dark theme
            doc.querySelectorAll("style, script, link[rel='stylesheet']").forEach(el => el.remove());

            const contentBody = document.getElementById("epubReaderContentBody");
            
            // Clear content body
            contentBody.innerHTML = "";

            // Create wrapper for the active chapter
            const wrapper = document.createElement("div");
            wrapper.className = "continuous-chapter-wrapper";
            wrapper.dataset.index = index;
            wrapper.dataset.title = chapter.title;
            wrapper.id = `chapter-wrap-${index}`;
            wrapper.innerHTML = `
                <div class="chapter-content-body">
                    ${doc.body ? doc.body.innerHTML : xhtmlText}
                </div>
            `;

            wrapper.querySelectorAll("*").forEach(el => {
                if (el.tagName && !el.tagName.toLowerCase().includes("img")) {
                    el.removeAttribute("style");
                }
            });
            contentBody.appendChild(wrapper);

            // Observe this wrapper
            if (this.observer) {
                this.observer.observe(wrapper);
            }

            // Set Title Header
            document.getElementById("readerCurrentChapterName").textContent = chapter.title;
            this.updateActiveTocHighlight();

            // Populate TTS Paragraph elements
            this.prepareTTSParagraphs();

            // Setup Page numbers & Scroll navigation metrics
            if (this.layout === "page-turn") {
                setTimeout(() => this.updatePageTurnMetrics(), 50);
            }

            this.hideLoader();
            document.getElementById("epubReaderViewport").scrollTop = 0;

        } catch (err) {
            this.hideLoader();
            alert("Failed to render chapter: " + err.message);
        }
    }

    async resolveChapterImages(xhtmlText, chapterPath) {
        const chapterDir = chapterPath.substring(0, chapterPath.lastIndexOf("/") + 1);
        const imgRegex = /<img\s+([^>]*?)src=["'](.+?)["']/gi;
        let match;
        const replacements = [];

        // Scan all images in XHTML
        while ((match = imgRegex.exec(xhtmlText)) !== null) {
            const fullMatch = match[0];
            const relativeSrc = match[2];
            
            // Skip base64 images already processed
            if (relativeSrc.startsWith("data:")) continue;

            const resolvedPath = this.resolveRelativePath(chapterDir, relativeSrc);
            const imageEntry = this.entries.find(e => e.filename === resolvedPath || decodeURIComponent(e.filename) === decodeURIComponent(resolvedPath));

            if (imageEntry) {
                try {
                    const ext = resolvedPath.split(".").pop().toLowerCase();
                    const mime = `image/${ext === "svg" ? "svg+xml" : ext}`;
                    const base64Url = await imageEntry.getData(new zip.Data64URIWriter(mime));
                    replacements.push({
                        target: relativeSrc,
                        replacement: base64Url
                    });
                } catch (e) {
                    console.warn(`Failed extracting chapter image ${resolvedPath}:`, e);
                }
            }
        }

        // Apply replacements
        replacements.forEach(rep => {
            xhtmlText = xhtmlText.split(rep.target).join(rep.replacement);
        });

        return xhtmlText;
    }

    updatePageTurnMetrics() {
        const viewport = document.getElementById("epubReaderViewport");
        const body = document.getElementById("epubReaderContentBody");
        if (this.layout !== "page-turn" || !viewport || !body) return;

        const viewportWidth = viewport.clientWidth;
        const scrollWidth = body.scrollWidth;
        const gap = 48; // Column gap set in CSS

        // Calculate total pages dynamically
        this.totalPages = Math.max(1, Math.round(scrollWidth / (viewportWidth + gap)));
        
        // Boundaries checks
        if (this.currentPage >= this.totalPages) {
            this.currentPage = this.totalPages - 1;
        }
        if (this.currentPage < 0) this.currentPage = 0;

        // Shift pages using hardware accelerated TranslateX
        const shift = this.currentPage * (viewportWidth + gap);
        body.style.transform = `translateX(-${shift}px)`;

        // Show page numbering
        document.getElementById("readerPageNum").textContent = `Page ${this.currentPage + 1} of ${this.totalPages}`;
    }

    navigatePage(dir) {
        if (this.layout !== "page-turn") return;
        
        this.currentPage += dir;
        if (this.currentPage < 0) {
            // Load previous chapter
            if (this.currentChapterIndex > 0) {
                this.loadChapter(this.currentChapterIndex - 1).then(() => {
                    // Start on the last page of the previous chapter
                    setTimeout(() => {
                        this.currentPage = this.totalPages - 1;
                        this.updatePageTurnMetrics();
                    }, 100);
                });
            } else if (this.currentChapterIndex === 0) {
                // Return to Cover
                this.currentChapterIndex = -1;
                this.renderCoverPage();
            }
            return;
        }

        if (this.currentPage >= this.totalPages) {
            // Load next chapter
            if (this.currentChapterIndex < this.toc.length - 1) {
                this.loadChapter(this.currentChapterIndex + 1);
            } else {
                this.currentPage = this.totalPages - 1; // Cap at end of book
            }
            return;
        }

        this.updatePageTurnMetrics();
    }

    // --- TEXT-TO-SPEECH (TTS) SYSTEM ---

    prepareTTSParagraphs() {
        this.ttsParagraphs = [];
        this.ttsCurrentIndex = 0;
        
        const contentBody = document.getElementById("epubReaderContentBody");
        if (!contentBody) return;

        if (this.ttsActive) {
            contentBody.classList.add("tts-mode-active");
        } else {
            contentBody.classList.remove("tts-mode-active");
        }

        // Select meaningful text element blocks to narrate
        const selectors = "p, h1, h2, h3, h4, li, blockquote";
        const blocks = Array.from(contentBody.querySelectorAll(selectors));

        blocks.forEach((el) => {
            const text = el.textContent.trim();
            if (text.length > 2) {
                // Save element and its text content
                this.ttsParagraphs.push({ element: el, text: text });
                const paraIndex = this.ttsParagraphs.length - 1;
                
                // Allow user to click any paragraph to jump speech directly to it
                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (this.ttsActive) {
                        if (this.speechUtterance) {
                            this.speechUtterance.onend = null;
                            this.speechUtterance.onerror = null;
                        }
                        window.speechSynthesis.cancel();
                        this.ttsCurrentIndex = paraIndex;
                        setTimeout(() => {
                            if (this.ttsActive) this.speakCurrentParagraph();
                        }, 50);
                    }
                });
            }
        });
    }

    playTTS() {
        if (this.ttsParagraphs.length === 0) return;
        
        if (window.speechSynthesis.paused && this.ttsActive) {
            window.speechSynthesis.resume();
            document.getElementById("ttsPlayBtn").style.display = "none";
            document.getElementById("ttsPauseBtn").style.display = "inline-flex";
            return;
        }

        this.stopTTS(); // clear active speech
        this.ttsActive = true;

        const contentBody = document.getElementById("epubReaderContentBody");
        if (contentBody) {
            contentBody.classList.add("tts-mode-active");
        }
        
        document.getElementById("ttsPlayBtn").style.display = "none";
        document.getElementById("ttsPauseBtn").style.display = "inline-flex";

        this.speakCurrentParagraph();
    }

    speakCurrentParagraph() {
        if (!this.ttsActive || this.ttsCurrentIndex >= this.ttsParagraphs.length) {
            this.stopTTS();
            return;
        }

        // Highlight Active Block
        this.ttsParagraphs.forEach(p => p.element.classList.remove("tts-active-paragraph"));
        const activeBlock = this.ttsParagraphs[this.ttsCurrentIndex];
        activeBlock.element.classList.add("tts-active-paragraph");

        // Scroll highlight paragraph into view smoothly if in scroll mode
        if (this.layout === "scroll") {
            activeBlock.element.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "center" });
        } else {
            // In Page-turn mode, calculate which page this paragraph is on and slide to it
            const viewport = document.getElementById("epubReaderViewport");
            const body = document.getElementById("epubReaderContentBody");
            const gap = 48;
            if (viewport && body) {
                const paraLeft = activeBlock.element.offsetLeft;
                const viewWidth = viewport.clientWidth;
                const targetPage = Math.floor(paraLeft / (viewWidth + gap));
                if (targetPage !== this.currentPage) {
                    this.currentPage = targetPage;
                    this.updatePageTurnMetrics();
                }
            }
        }

        // Setup Utterance
        this.speechUtterance = new SpeechSynthesisUtterance(activeBlock.text);
        
        // Apply Selected Speech Voice
        if (this.selectedVoiceURI && this.voices.length > 0) {
            const voiceObj = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
            if (voiceObj) {
                this.speechUtterance.voice = voiceObj;
            }
        }
        
        // Apply Speed & Pitch sliders
        const rateSlider = document.getElementById("ttsRateInput");
        const pitchSlider = document.getElementById("ttsPitchInput");
        this.speechUtterance.rate = rateSlider ? parseFloat(rateSlider.value) : 1.0;
        this.speechUtterance.pitch = pitchSlider ? parseFloat(pitchSlider.value) : 1.0;

        // End of speech callback
        this.speechUtterance.onend = () => {
            this.ttsCurrentIndex++;
            this.speakCurrentParagraph();
        };

        this.speechUtterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            if (this.ttsActive) {
                this.stopTTS();
            }
        };

        window.speechSynthesis.speak(this.speechUtterance);
    }

    pauseTTS() {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            document.getElementById("ttsPauseBtn").style.display = "none";
            document.getElementById("ttsPlayBtn").style.display = "inline-flex";
        }
    }

    stopTTS() {
        this.ttsActive = false;
        window.speechSynthesis.cancel();
        
        const contentBody = document.getElementById("epubReaderContentBody");
        if (contentBody) {
            contentBody.classList.remove("tts-mode-active");
        }

        // Remove Highlights
        this.ttsParagraphs.forEach(p => p.element.classList.remove("tts-active-paragraph"));
        
        const playBtn = document.getElementById("ttsPlayBtn");
        const pauseBtn = document.getElementById("ttsPauseBtn");
        if (playBtn && pauseBtn) {
            playBtn.style.display = "inline-flex";
            pauseBtn.style.display = "none";
        }
    }

    // Utility path solver
    resolveRelativePath(baseDir, relativePath) {
        // Strip out leading './' or relative path dots
        let absoluteParts = (baseDir + relativePath).split("/");
        let resolvedStack = [];
        for (let part of absoluteParts) {
            if (part === "..") {
                resolvedStack.pop();
            } else if (part !== "." && part !== "") {
                resolvedStack.push(part);
            }
        }
        return resolvedStack.join("/");
    }

    showLoader() {
        const loader = document.getElementById("epubReaderLoader");
        if (loader) loader.style.display = "flex";
    }

    hideLoader() {
        const loader = document.getElementById("epubReaderLoader");
        if (loader) loader.style.display = "none";
    }

    // --- LIVE NOVEL SCRAPING & LAZY READER CONTROLLERS ---

    async loadLazyBook(url, loadRequestId = this.activeLoadRequestId) {
        try {
            this.stopTTS();
            this.showLoader();

            if (typeof ParserEnvironment !== "undefined") {
                await ParserEnvironment.ensureLoaded();
            }
            
            // Initialize caching
            this.lazyCache = new Map();
            this.lazyLoadingQueue = new Set();
            this.lazyPromiseMap = new Map();
            this.entries = [];
            this.opfEntry = null;
            
            // 1. Fetch novel's main page
            let xhr = await HttpClient.wrapFetch(url);
            let doc = xhr?.responseXML;
            if (!doc && xhr?.responseText) {
                doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
            }
            if (!doc) {
                throw new Error("Failed to load novel page XML. The website might be blocking us, or the CORS proxy failed.");
            }

            // Ensure baseURI is explicitly defined (crucial for custom parsers in live reader mode)
            try {
                Object.defineProperty(doc, "baseURI", {
                    get: () => url,
                    configurable: true
                });
            } catch (e) {
                console.warn("Could not redefine baseURI on doc:", e);
            }

            if (loadRequestId !== this.activeLoadRequestId) {
                return;
            }

            this.lazyUserPreferences = this.getLazyUserPreferences();
            this.lazyParser = this.getLazyParser(url, doc);
            
            // 2. Extract metadata
            this.metaInfo.title = this.extractLazyTitle(doc);
            this.metaInfo.author = this.extractLazyAuthor(doc);
            this.metaInfo.coverDataUrl = this.extractLazyCover(doc, url);
            
            // 3. Extract TOC
            this.toc = await this.extractLazyToc(doc, url);
            if (this.toc.length === 0) {
                throw new Error("No chapter links could be found on this page. The layout might be unsupported.");
            }

            if (loadRequestId !== this.activeLoadRequestId) {
                return;
            }
            
            // 4. Render TOC Sidebar
            this.renderSidebarToC();
            
            // 5. Open cover/start view
            this.currentChapterIndex = -1;
            this.renderCoverPage();
            
            if (loadRequestId === this.activeLoadRequestId) {
                this.hideLoader();
            }
        } catch (e) {
            if (loadRequestId === this.activeLoadRequestId) {
                this.hideLoader();
                alert("Live Reader Error: " + e.message);
            }
        }
    }

    extractLazyTitle(doc) {
        if (this.lazyParser) {
            try {
                let title = this.lazyParser.extractTitle(doc);
                if (title) {
                    return title.replace(/[\-\|].+$/, "").trim();
                }
            } catch (error) {
                console.warn("[Live Reader] Parser title extraction failed:", error);
            }
        }
        let ogTitle = doc.querySelector("meta[property='og:title']");
        if (ogTitle && ogTitle.getAttribute("content")) {
            return ogTitle.getAttribute("content").replace(/[\-\|].+$/, "").trim();
        }
        return doc.title ? doc.title.replace(/[\-\|].+$/, "").trim() : "Live Novel";
    }

    extractLazyAuthor(doc) {
        if (this.lazyParser) {
            try {
                let author = this.lazyParser.extractAuthor(doc);
                if (author && author.trim() && author.trim() !== "<unknown>") {
                    return author.trim();
                }
            } catch (error) {
                console.warn("[Live Reader] Parser author extraction failed:", error);
            }
        }
        let ogAuthor = doc.querySelector("meta[property='og:book:author']");
        if (ogAuthor && ogAuthor.getAttribute("content")) return ogAuthor.getAttribute("content").trim();
        let authorMeta = doc.querySelector("meta[name='author']");
        if (authorMeta && authorMeta.getAttribute("content")) return authorMeta.getAttribute("content").trim();
        
        let authorEl = doc.querySelector(".author, [class*='author'] a, [id*='author']");
        if (authorEl) return authorEl.textContent.trim();
        return "Live Scraped";
    }

    extractLazyCover(doc, baseUrl) {
        let ogImage = doc.querySelector("meta[property='og:image']");
        if (ogImage && ogImage.getAttribute("content")) {
            let src = ogImage.getAttribute("content");
            return src ? new URL(src, baseUrl).href : "";
        }
        let bookCover = doc.querySelector(".book-cover img, .cover img, img.cover, .novel-cover img");
        if (bookCover && bookCover.src) {
            return new URL(bookCover.src, baseUrl).href;
        }
        let firstImg = doc.querySelector("img");
        if (firstImg && firstImg.src) {
            return new URL(firstImg.src, baseUrl).href;
        }
        return "";
    }

    cleanChapterTitle(text) {
        if (!text) return "";
        let clean = text
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Remove crawler/page suffixes like "_1", "_2"
        clean = clean.replace(/(?:\s|_)+\d+$/, "").trim();

        // Convert "2357: Title" into "Chapter 2357: Title"
        let bareNumberMatch = clean.match(/^(\d+(?:\.\d+)?)\s*[:\-]\s*(.+)$/);
        if (bareNumberMatch) {
            return `Chapter ${bareNumberMatch[1]}: ${bareNumberMatch[2].trim()}`;
        }

        // Collapse repeated chapter prefixes such as
        // "Chapter 8 Chapter 8 Notes" or "Chapter 8: Chapter 8: Notes"
        let repeatedMatch = clean.match(/^(Chapter|Ch|Ch\.)\s*(\d+(?:\.\d+)?)\s*[:\- ]+\s*(?:Chapter|Ch|Ch\.)\s*(\d+(?:\.\d+)?)\s*[:\- ]*(.*)$/i);
        if (repeatedMatch) {
            let chosenNumber = repeatedMatch[2] === repeatedMatch[3]
                ? repeatedMatch[2]
                : repeatedMatch[2];
            let rest = repeatedMatch[4].trim();
            clean = rest ? `Chapter ${chosenNumber}: ${rest}` : `Chapter ${chosenNumber}`;
        }

        // Fix titles like "Chapter 44 Do you know what ambergris is?"
        let chapterWithBody = clean.match(/^(Chapter|Ch|Ch\.)\s*(\d+(?:\.\d+)?)\s+(.*)$/i);
        if (chapterWithBody) {
            let rest = chapterWithBody[3].trim();
            if (rest && !/^(?:[:\-]|chapter|ch|ch\.)/i.test(rest)) {
                clean = `Chapter ${chapterWithBody[2]}: ${rest}`;
            }
        }

        // Normalize spacing around colon
        clean = clean.replace(/^Chapter\s+(\d+(?:\.\d+)?)\s*[:\-]?\s*(.*)$/i, (match, number, rest) => {
            let body = rest.trim();
            return body ? `Chapter ${number}: ${body}` : `Chapter ${number}`;
        });

        return clean.trim();
    }

    deriveChapterTitleFromUrl(url, fallbackTitle = "") {
        try {
            let pathname = new URL(url).pathname;
            let slug = pathname.split("/").filter(Boolean).pop() || "";
            slug = decodeURIComponent(slug)
                .replace(/\.[a-z0-9]+$/i, "")
                .replace(/[_+]+/g, "-")
                .toLowerCase();

            let chapterNumberMatch = slug.match(/(?:^|-)chapter-(\d+(?:\.\d+)?)(?:-|$)/i)
                || slug.match(/(?:^|-)ch-(\d+(?:\.\d+)?)(?:-|$)/i);

            if (!chapterNumberMatch) {
                return this.cleanChapterTitle(fallbackTitle);
            }

            let chapterNumber = chapterNumberMatch[1];

            slug = slug
                .replace(new RegExp(`(^|-)chapter-${chapterNumber}(?=-|$)`, "ig"), "$1")
                .replace(new RegExp(`(^|-)ch-${chapterNumber}(?=-|$)`, "ig"), "$1")
                .replace(/^-+|-+$/g, "");

            // Remove duplicate chapter markers and noisy trailing page counters.
            while (new RegExp(`(?:^|-)chapter-${chapterNumber}(?:-|$)`, "i").test(slug)) {
                slug = slug.replace(new RegExp(`(^|-)chapter-${chapterNumber}(?=-|$)`, "ig"), "$1");
                slug = slug.replace(/^-+|-+$/g, "");
            }
            slug = slug.replace(/\d+$/g, "").replace(/^-+|-+$/g, "");

            let words = slug
                .split("-")
                .filter(Boolean)
                .filter(word => !/^(chapter|ch)$/.test(word))
                .map(word => {
                    if (/^\d+$/.test(word)) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1);
                });

            let body = words.join(" ").replace(/\s+/g, " ").trim();
            return body ? `Chapter ${chapterNumber}: ${body}` : `Chapter ${chapterNumber}`;
        } catch (error) {
            return this.cleanChapterTitle(fallbackTitle);
        }
    }

    shouldPreferUrlTitle(rawTitle, urlTitle) {
        if (!rawTitle) {
            return true;
        }

        let cleanRaw = this.cleanChapterTitle(rawTitle);
        if (!cleanRaw) {
            return true;
        }

        if (cleanRaw.includes("_") || /(?:\s|_)\d+$/.test(rawTitle)) {
            return true;
        }

        let rawNumber = this.parseChapterNumber(cleanRaw, rawTitle);
        let urlNumber = this.parseChapterNumber(urlTitle, urlTitle);
        if (rawNumber !== 999999 && urlNumber !== 999999 && rawNumber !== urlNumber) {
            return true;
        }

        let duplicatePrefix = /^(Chapter|Ch|Ch\.)\s*\d+(?:\.\d+)?\s*[:\- ]+\s*(Chapter|Ch|Ch\.)\s*\d+(?:\.\d+)?/i;
        return duplicatePrefix.test(cleanRaw);
    }

    parseChapterNumber(title, href) {
        const tLower = title.toLowerCase();
        
        // 1. Look for "chapter X", "ch X", "ch. X", "episode X", "ep X", "ep. X", "vol X", "vol. X", "volume X"
        let match = tLower.match(/(?:chapter|ch\.?|ep\.?|episode|volume|vol\.?)\s*(\d+(?:\.\d+)?)/);
        if (match) return parseFloat(match[1]);

        // 2. Look for isolated numbers in title, e.g. "Chapter 12" -> 12, "Ch 1.5" -> 1.5
        match = tLower.match(/\b(\d+(?:\.\d+)?)\b/);
        if (match) return parseFloat(match[1]);

        // 3. Try from URL path or query params
        const urlMatch = href.match(/[-_](?:chapter|ch)[-_](\d+(?:\.\d+)?)/i) || href.match(/chapter-(\d+(?:\.\d+)?)/i);
        if (urlMatch) return parseFloat(urlMatch[1]);

        // 4. Look for trailing numbers in the URL slug before extension
        const urlNumMatch = href.match(/\/(\d+(?:\.\d+)?)(?:\.html|\/)?$/);
        if (urlNumMatch) return parseFloat(urlNumMatch[1]);

        return 999999; // Fallback for non-numbered items
    }

    extractLazyChapterLinks(doc, baseUrl) {
        let links = Array.from(doc.querySelectorAll("a"));
        let chapters = [];
        let seen = new Set();
        
        links.forEach(a => {
            let href = a.href;
            if (!href || href.startsWith("javascript:") || href.startsWith("#") || href.includes("login") || href.includes("register")) return;
            
            let absoluteUrl = new URL(href, baseUrl).href;
            if (seen.has(absoluteUrl)) return;
            
            let text = a.textContent.trim();
            text = this.cleanChapterTitle(text);
            let hrefLower = absoluteUrl.toLowerCase();
            let textLower = text.toLowerCase();

            // Filter out pagination links:
            // 1. Text is purely a small number (e.g., 1, 2, 3...)
            let isPureNumber = /^\d+$/.test(text);
            if (isPureNumber) {
                let isPager = false;
                if (absoluteUrl.includes("page") || absoluteUrl.includes("p=") || absoluteUrl.includes("pagenum")) {
                    isPager = true;
                }
                let parent = a.parentElement;
                while (parent && parent !== doc.body) {
                    let className = (parent.className || "").toString().toLowerCase();
                    let idName = (parent.id || "").toString().toLowerCase();
                    if (className.includes("page") || className.includes("pager") || className.includes("pagination") ||
                        idName.includes("page") || idName.includes("pager") || idName.includes("pagination")) {
                        isPager = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                if (isPager) return; // Skip it!
            }

            // 2. Text is pager navigation labels like Next, Prev, Last, etc.
            let isPagerLabel = /^(next|prev|previous|last|first|>>|<<|>|<)$/i.test(text) || textLower.includes("page ");
            if (isPagerLabel) {
                let isPager = false;
                if (absoluteUrl.includes("page") || absoluteUrl.includes("p=") || absoluteUrl.includes("pagenum")) {
                    isPager = true;
                }
                let parent = a.parentElement;
                while (parent && parent !== doc.body) {
                    let className = (parent.className || "").toString().toLowerCase();
                    let idName = (parent.id || "").toString().toLowerCase();
                    if (className.includes("page") || className.includes("pager") || className.includes("pagination") ||
                        idName.includes("page") || idName.includes("pager") || idName.includes("pagination")) {
                        isPager = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                if (isPager) return; // Skip pager labels!
            }
            
            let isChapter = false;
            if (textLower.includes("chapter") || textLower.includes("ch ") || textLower.includes("ch.") || /^\d+$/.test(textLower) || textLower.startsWith("vol ") || textLower.startsWith("episode")) {
                isChapter = true;
            } else if (hrefLower.includes("chapter") || hrefLower.includes("/ch-") || hrefLower.includes("-chapter-") || hrefLower.includes("/read/")) {
                isChapter = true;
            }
            
            if (isChapter && text.length > 0 && text.length < 100) {
                seen.add(absoluteUrl);
                chapters.push({
                    title: text,
                    href: absoluteUrl,
                    sourceUrl: absoluteUrl
                });
            }
        });
        
        if (chapters.length < 3) {
            links.forEach(a => {
                let href = a.href;
                if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
                let absoluteUrl = new URL(href, baseUrl).href;
                if (seen.has(absoluteUrl)) return;
                let text = a.textContent.trim();
                text = this.cleanChapterTitle(text);
                if (text.length > 0 && text.length < 60 && /\d+/.test(text)) {
                    seen.add(absoluteUrl);
                    chapters.push({
                        title: text,
                        href: absoluteUrl,
                        sourceUrl: absoluteUrl
                    });
                }
            });
        }

        // Deduplicate and Sort
        let uniqueChapters = [];
        let seenNumbers = new Set();
        let seenUrls = new Set();
        
        chapters.forEach(ch => {
            let chNum = this.parseChapterNumber(ch.title, ch.href);
            if (seenUrls.has(ch.href)) return;
            
            if (chNum !== 999999 && seenNumbers.has(chNum)) {
                let existing = uniqueChapters.find(c => this.parseChapterNumber(c.title, c.href) === chNum);
                if (existing) {
                    if (ch.title.length > existing.title.length) {
                        existing.title = ch.title;
                        existing.href = ch.href;
                    }
                    return;
                }
            }
            
            seenUrls.add(ch.href);
            if (chNum !== 999999) {
                seenNumbers.add(chNum);
            }
            uniqueChapters.push(ch);
        });

        uniqueChapters.sort((a, b) => {
            let numA = this.parseChapterNumber(a.title, a.href);
            let numB = this.parseChapterNumber(b.title, b.href);
            
            if (numA !== numB) {
                return numA - numB;
            }
            return a.title.localeCompare(b.title);
        });

        return uniqueChapters;
    }

    getLazyUserPreferences() {
        if (this.lazyUserPreferences) {
            return this.lazyUserPreferences;
        }

        try {
            if (typeof UserPreferences !== "undefined" && typeof UserPreferences.readFromLocalStorage === "function") {
                return UserPreferences.readFromLocalStorage();
            }
        } catch (error) {
            console.warn("[Live Reader] Failed loading user preferences:", error);
        }

        return null;
    }

    getLazyParser(url, doc) {
        if (typeof parserFactory === "undefined") {
            return null;
        }

        let parser = parserFactory.fetch(url, doc);
        if (!parser) {
            return null;
        }

        parser.state.chapterListUrl = url;
        parser.state.firstPageDom = doc;

        let userPreferences = this.getLazyUserPreferences();
        if (userPreferences) {
            try {
                parser.onUserPreferencesUpdate(userPreferences);
            } catch (error) {
                console.warn("[Live Reader] Parser preference initialization failed:", error);
            }
        }

        return parser;
    }

    async extractLazyToc(doc, url) {
        let tocProgressCollector = [];
        let chapterUrlsUI = {
            showTocProgress: (chapters) => {
                if (Array.isArray(chapters) && chapters.length > 0) {
                    tocProgressCollector = tocProgressCollector.concat(chapters);
                }
            }
        };

        if (this.lazyParser && typeof this.lazyParser.getChapterUrls === "function") {
            try {
                let parserChapters = await this.lazyParser.getChapterUrls(doc, chapterUrlsUI);
                let normalizedChapters = this.normalizeLazyTocChapters(parserChapters, url);
                if (normalizedChapters.length > 0) {
                    return normalizedChapters;
                }
            } catch (error) {
                console.warn("[Live Reader] Parser TOC extraction failed, trying parser-collected partial TOC:", error);

                let partialToc = this.normalizeLazyTocChapters(tocProgressCollector, url);
                if (partialToc.length > 0) {
                    return partialToc;
                }

                let tolerantToc = await this.extractLazyTocFromParserPagesTolerantly(doc, chapterUrlsUI, url);
                if (tolerantToc.length > 0) {
                    return tolerantToc;
                }
            }
        }

        return this.extractLazyChapterLinks(doc, url);
    }

    async extractLazyTocFromParserPagesTolerantly(doc, chapterUrlsUI, baseUrl) {
        if (!this.lazyParser) {
            return [];
        }

        if (typeof this.lazyParser.extractPartialChapterList !== "function"
            || typeof this.lazyParser.getUrlsOfTocPages !== "function") {
            return [];
        }

        let chapters = [];
        try {
            let firstBatch = this.lazyParser.extractPartialChapterList(doc) || [];
            chapters = chapters.concat(firstBatch);
            chapterUrlsUI.showTocProgress(firstBatch);
        } catch (error) {
            console.warn("[Live Reader] Failed extracting first TOC page via parser helper:", error);
        }

        let tocPageUrls = [];
        try {
            tocPageUrls = this.lazyParser.getUrlsOfTocPages(doc) || [];
        } catch (error) {
            console.warn("[Live Reader] Failed enumerating TOC pages via parser helper:", error);
        }

        let pendingUrls = [...tocPageUrls];
        for (let attempt = 1; attempt <= 3 && pendingUrls.length > 0; attempt++) {
            let failedUrls = [];
            for (let tocPageUrl of pendingUrls) {
                try {
                    await this.lazyParser.rateLimitDelay();
                    let xhr = await HttpClient.wrapFetch(tocPageUrl);
                    let tocDoc = xhr?.responseXML;
                    if (!tocDoc && xhr?.responseText) {
                        tocDoc = new DOMParser().parseFromString(xhr.responseText, "text/html");
                    }
                    if (!tocDoc) {
                        failedUrls.push(tocPageUrl);
                        continue;
                    }
                    let partialList = this.lazyParser.extractPartialChapterList(tocDoc) || [];
                    chapters = chapters.concat(partialList);
                    chapterUrlsUI.showTocProgress(partialList);
                } catch (error) {
                    console.warn(`[Live Reader] TOC page fetch failed on attempt ${attempt}: ${tocPageUrl}`, error);
                    failedUrls.push(tocPageUrl);
                }
            }
            pendingUrls = failedUrls;
        }

        return this.normalizeLazyTocChapters(chapters, baseUrl);
    }

    normalizeLazyTocChapters(chapters, baseUrl) {
        if (!Array.isArray(chapters)) {
            return [];
        }

        let seen = new Set();
        let toc = [];

        chapters.forEach((chapter, index) => {
            let rawUrl = chapter?.sourceUrl || chapter?.href;
            if (!rawUrl) {
                return;
            }

            let absoluteUrl = "";
            try {
                absoluteUrl = new URL(rawUrl, baseUrl).href;
            } catch (error) {
                return;
            }

            if (seen.has(absoluteUrl)) {
                return;
            }
            seen.add(absoluteUrl);

            let rawTitle = chapter?.title?.trim() || "";
            let urlTitle = this.deriveChapterTitleFromUrl(absoluteUrl, rawTitle || `Chapter ${index + 1}`);
            let title = this.shouldPreferUrlTitle(rawTitle, urlTitle)
                ? urlTitle
                : this.cleanChapterTitle(rawTitle);
            if (!title) {
                title = urlTitle || `Chapter ${index + 1}`;
            }

            toc.push({
                title: title,
                href: absoluteUrl,
                sourceUrl: absoluteUrl,
                isPlaceholder: true
            });
        });

        return this.filterDiscontinuousLazyToc(toc);
    }

    filterDiscontinuousLazyToc(toc) {
        if (toc.length < 3) {
            return toc;
        }

        let sorted = [...toc].sort((a, b) => {
            let numA = this.parseChapterNumber(a.title, a.href);
            let numB = this.parseChapterNumber(b.title, b.href);
            if (numA !== numB) {
                return numA - numB;
            }
            return a.title.localeCompare(b.title);
        });

        let kept = [sorted[0]];
        let previousNumber = this.parseChapterNumber(sorted[0].title, sorted[0].href);

        for (let i = 1; i < sorted.length; i++) {
            let current = sorted[i];
            let currentNumber = this.parseChapterNumber(current.title, current.href);

            if (previousNumber === 999999 || currentNumber === 999999) {
                kept.push(current);
                previousNumber = currentNumber;
                continue;
            }

            let gap = currentNumber - previousNumber;
            let remaining = sorted.length - i;

            // Large positive jumps near the tail are usually incomplete TOC fetches,
            // e.g. chapters 1..50 plus the final 3 latest chapters.
            if (gap > 25 && remaining <= 5 && kept.length >= 10) {
                console.warn(`[Live Reader] Dropping discontinuous TOC tail starting at chapter ${currentNumber}.`);
                break;
            }

            kept.push(current);
            previousNumber = currentNumber;
        }

        return kept;
    }

    preloadLazyChapters(startIndex) {
        if (!this.isLazyScraped) return;
        const count = this.lazyPrefetchCount;
        if (count <= 0) return;
        for (let i = startIndex; i < startIndex + count && i < this.toc.length; i++) {
            this.loadLazyChapterIntoCache(i).catch(() => {});
        }
    }

    async loadLazyChapterIntoCache(index) {
        if (index < 0 || index >= this.toc.length) return;
        if (this.lazyCache.has(index)) return;
        const loadRequestId = this.activeLoadRequestId;
        
        if (!this.lazyPromiseMap) {
            this.lazyPromiseMap = new Map();
        }

        if (this.lazyPromiseMap.has(index)) {
            await this.lazyPromiseMap.get(index);
            return;
        }
        
        const chapter = this.toc[index];
        
        const fetchPromise = (async () => {
            try {
                let xhr = await HttpClient.wrapFetch(chapter.href);
                let doc = xhr?.responseXML;
                if (!doc && xhr?.responseText) {
                    doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
                }
                if (doc) {
                    if (loadRequestId !== this.activeLoadRequestId) {
                        return;
                    }
                    let contentEl = this.extractLazyChapterContent(doc, chapter.href);
                    let cleanHtml = contentEl ? contentEl.innerHTML : doc.body.innerHTML;
                    
                    let tempDiv = document.createElement("div");
                    tempDiv.innerHTML = cleanHtml;
                    tempDiv.querySelectorAll("script, style, iframe, select, input, button, noscript").forEach(el => el.remove());
                    
                    if (loadRequestId === this.activeLoadRequestId) {
                        this.lazyCache.set(index, tempDiv.innerHTML);
                    }
                } else {
                    throw new Error("Failed to load chapter content XML from source.");
                }
            } catch (e) {
                console.warn(`[Live Reader] Failed preloading chapter ${index}:`, e);
                throw e; // Rethrow to let lazyLoadChapter catch it
            }
        })();

        this.lazyPromiseMap.set(index, fetchPromise);
        
        try {
            await fetchPromise;
        } finally {
            this.lazyPromiseMap.delete(index);
        }
    }

    extractLazyChapterContent(doc, url) {
        let hostname = "";
        if (url) {
            hostname = util.extractHostName(url);
        } else if (doc && doc.baseURI) {
            hostname = util.extractHostName(doc.baseURI);
        }

        if (hostname) {
            try {
                let serialized = window.localStorage.getItem("DefaultParserConfigs");
                if (serialized) {
                    let configs = JSON.parse(serialized);
                    let hostnameLower = hostname.toLowerCase();
                    let hostnameNoWww = hostnameLower.replace(/^www\./, "");
                    let customConfig = null;
                    for (let entry of configs) {
                        let configHost = entry[0].toLowerCase();
                        let configHostNoWww = configHost.replace(/^www\./, "");
                        if (configHost === hostnameLower || configHostNoWww === hostnameNoWww) {
                            customConfig = entry[1];
                            break;
                        }
                    }
                    if (customConfig && customConfig.contentCss) {
                        let el = doc.querySelector(customConfig.contentCss);
                        if (el) {
                            let cloned = el.cloneNode(true);
                            if (customConfig.removeCss) {
                                cloned.querySelectorAll(customConfig.removeCss).forEach(removeEl => removeEl.remove());
                            }
                            if (typeof util !== "undefined") {
                                if (typeof util.removeComments === "function") util.removeComments(cloned);
                                if (typeof util.removeUnwantedWordpressElements === "function") util.removeUnwantedWordpressElements(cloned);
                                if (typeof util.removeMicrosoftWordCrapElements === "function") util.removeMicrosoftWordCrapElements(cloned);
                            }
                            return cloned;
                        }
                    }
                }
            } catch (e) {
                console.warn("[Live Reader] Failed to apply custom default parser configuration:", e);
            }
        }

        let commonSelectors = [
            ".chapter-content", ".entry-content", ".read-content", 
            "#chapter-content", "#chapterContent", "article", 
            ".post-content", ".chapter-inner", ".novel-content",
            ".reader-content", ".text-left"
        ];
        for (let selector of commonSelectors) {
            let el = doc.querySelector(selector);
            if (el && el.querySelectorAll("p").length > 3) {
                return el.cloneNode(true);
            }
        }
        
        let bestElement = null;
        let maxParagraphs = 0;
        doc.querySelectorAll("div, section, article").forEach(el => {
            let pCount = el.querySelectorAll("p").length;
            if (pCount > maxParagraphs) {
                maxParagraphs = pCount;
                bestElement = el;
            }
        });
        
        if (bestElement && maxParagraphs > 2) {
            return bestElement.cloneNode(true);
        }
        return doc.body.cloneNode(true);
    }

    async loadLazyChapter(index) {
        this.currentChapterIndex = index;
        this.loadedChaptersIndex = index;
        this.currentPage = 0;
        document.getElementById("epubReaderContentBody").style.transform = "";

        if (this.observer) {
            this.observer.disconnect();
        }

        const chapter = this.toc[index];
        
        if (!this.lazyCache.has(index)) {
            this.showLoader();
            await this.loadLazyChapterIntoCache(index);
            this.hideLoader();
        }

        const xhtmlText = this.lazyCache.get(index) || "<p>Failed to load chapter content from source link.</p>";
        const contentBody = document.getElementById("epubReaderContentBody");
        contentBody.innerHTML = "";

        if (index === 0 && this.layout === "scroll") {
            const coverSrc = this.metaInfo.coverDataUrl || "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNjAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMWExZjtkc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsiPgo8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzFhMWExZiIvPgo8dGV4dCB4PSI1MCUiIHk9IjMwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OT1ZFTCBSRUFERVI8L3RleHQ+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjMDBmNWZmIiBmb250LXNpemU9IjI4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRleHQtZGVjb3JhdGlvbj0idW5kZXJsaW5lIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";
            const coverWrapper = document.createElement("div");
            coverWrapper.className = "continuous-chapter-wrapper";
            coverWrapper.dataset.index = -1;
            coverWrapper.dataset.title = "Book Cover";
            coverWrapper.id = "chapter-wrap-cover";
            coverWrapper.innerHTML = `
                <div class="reader-cover-container" style="min-height: calc(100vh - 120px); margin-bottom: 60px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; width:100%; max-width:100%; overflow:hidden;">
                    <img class="reader-cover-img" src="${coverSrc}" alt="Book Cover" style="max-height:60vh; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.4); margin-bottom:24px; max-width:100%;">
                    <h1 class="reader-cover-title" style="font-weight:700; margin-bottom:8px;">${this.metaInfo.title || "Live Novel"}</h1>
                    <div class="reader-cover-author" style="font-size:1.25rem; color:var(--reader-muted);">Source: ${this.metaInfo.author || "Live Scraped"}</div>
                    <div style="margin-top: 30px; color: var(--primary, #00f5ff); font-weight: 700; font-size: 0.95rem; letter-spacing: 0.05em;">
                        SCROLL DOWN TO START READING ↓
                    </div>
                </div>
            `;
            contentBody.appendChild(coverWrapper);
            if (this.observer) this.observer.observe(coverWrapper);
        }

        const wrapper = document.createElement("div");
        wrapper.className = "continuous-chapter-wrapper";
        wrapper.dataset.index = index;
        wrapper.dataset.title = chapter.title;
        wrapper.id = `chapter-wrap-${index}`;
        wrapper.innerHTML = `
            <div class="chapter-content-body">
                ${xhtmlText}
            </div>
        `;
        contentBody.appendChild(wrapper);
        if (this.observer) this.observer.observe(wrapper);

        // Header Title
        document.getElementById("readerCurrentChapterName").textContent = chapter.title;
        this.updateActiveTocHighlight();
        
        // Prepare TTS
        this.prepareTTSParagraphs();

        // Footer & Prev/Next Chapter buttons
        if (this.layout === "page-turn") {
            setTimeout(() => this.updatePageTurnMetrics(), 50);
        } else {
            document.getElementById("readerPageNum").textContent = `Chapter ${index + 1}/${this.toc.length}`;

            const navDiv = document.createElement("div");
            navDiv.style.cssText = "display: flex; justify-content: space-between; margin-top: 50px; padding-top: 24px; border-top: 1px solid var(--reader-border); gap: 16px; width: 100%; box-sizing: border-box; padding-bottom: 50px;";
            
            let navHTML = "";
            if (index > 0) {
                navHTML += "<button id=\"chapterNavPrev\" class=\"reader-btn\" style=\"flex:1; justify-content:center; padding:12px; cursor:pointer;\"><svg viewBox=\"0 0 24 24\" style=\"width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;stroke:currentColor;fill:none;stroke-width:2.5;\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M15.75 19.5L8.25 12l7.5-7.5\" /></svg> Previous Chapter</button>";
            } else {
                navHTML += "<button id=\"chapterNavPrev\" class=\"reader-btn\" style=\"flex:1; justify-content:center; padding:12px; cursor:pointer;\"><svg viewBox=\"0 0 24 24\" style=\"width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;stroke:currentColor;fill:none;stroke-width:2.5;\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M15.75 19.5L8.25 12l7.5-7.5\" /></svg> Book Cover</button>";
            }
            
            if (index < this.toc.length - 1) {
                navHTML += "<button id=\"chapterNavNext\" class=\"reader-btn\" style=\"flex:1; justify-content:center; padding:12px; background:var(--primary, #00f5ff); color:#000; border:none; cursor:pointer; font-weight:700;\">Next Chapter <svg viewBox=\"0 0 24 24\" style=\"width:14px;height:14px;display:inline-block;vertical-align:middle;margin-left:4px;stroke:currentColor;fill:none;stroke-width:2.5;\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M8.25 4.5l7.5 7.5-7.5 7.5\" /></svg></button>";
            }
            navDiv.innerHTML = navHTML;
            contentBody.appendChild(navDiv);

            const prevBtn = document.getElementById("chapterNavPrev");
            const nextBtn = document.getElementById("chapterNavNext");
            if (prevBtn) {
                prevBtn.addEventListener("click", () => {
                    if (index > 0) {
                        this.loadChapter(index - 1);
                    } else {
                        this.currentChapterIndex = -1;
                        this.renderCoverPage();
                    }
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    this.loadChapter(index + 1);
                });
            }
        }

        document.getElementById("epubReaderViewport").scrollTop = 0;
        
        // Start pre-loading next 10 chapters
        this.preloadLazyChapters(index + 1);
    }

    async appendNextLazyChapter() {
        if (this.isChapterLoading || this.loadedChaptersIndex >= this.toc.length - 1) return;
        this.isChapterLoading = true;

        const nextIndex = this.loadedChaptersIndex + 1;
        const chapter = this.toc[nextIndex];

        try {
            if (!this.lazyCache.has(nextIndex)) {
                await this.loadLazyChapterIntoCache(nextIndex);
            }

            const xhtmlText = this.lazyCache.get(nextIndex);
            if (!xhtmlText) {
                this.isChapterLoading = false;
                return;
            }

            const contentBody = document.getElementById("epubReaderContentBody");

            // Create wrapper
            const wrapper = document.createElement("div");
            wrapper.className = "continuous-chapter-wrapper";
            wrapper.dataset.index = nextIndex;
            wrapper.dataset.title = chapter.title;
            wrapper.id = `chapter-wrap-${nextIndex}`;

            wrapper.innerHTML = `
                <div class="chapter-scroll-divider">
                    <span>${chapter.title}</span>
                </div>
                <div class="chapter-content-body">
                    ${xhtmlText}
                </div>
            `;
            contentBody.appendChild(wrapper);

            if (this.observer) this.observer.observe(wrapper);

            this.loadedChaptersIndex = nextIndex;

            // Re-prepare TTS paragraphs
            const activeTtsIndex = this.ttsCurrentIndex;
            this.prepareTTSParagraphs();
            this.ttsCurrentIndex = activeTtsIndex;

            this.isChapterLoading = false;
            
            // Queue next preloads
            this.preloadLazyChapters(nextIndex + 1);
        } catch (err) {
            console.error("Failed to append next lazy chapter:", err);
            this.isChapterLoading = false;
        }
    }

    dataUrlToBlob(dataUrl) {
        const [header, base64] = dataUrl.split(",");
        const mime = header.match(/:(.*?);/)[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return new Blob([array], { type: mime });
    }
}
