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
        this.activeLoadRequestId = 0;
    }


    init() {
        if (typeof zip !== "undefined") {
            EpubViewerUI._configureZipRuntime();
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

        // TTS Event Delegation and Scroll Detection
        const contentBody = document.getElementById("epubReaderContentBody");
        if (contentBody) {
            contentBody.addEventListener("click", (e) => {
                if (!this.ttsActive) return;
                const p = e.target.closest("p, h1, h2, h3, h4, li, blockquote");
                if (p) {
                    this.prepareTTSParagraphs();
                    const idx = this.ttsParagraphs.findIndex(item => item.element === p);
                    if (idx !== -1) {
                        this.ttsCurrentIndex = idx;
                        this.ttsAutoScroll = true; // resume auto-scroll on manual jump
                        this.speakCurrentParagraph();
                    }
                }
            });
        }
        
        const mainReader = document.getElementById("epubReaderMain");
        if (mainReader) {
            const disableAutoScroll = () => {
                if (this.ttsActive && !this.isAutoScrolling) this.ttsAutoScroll = false;
            };
            mainReader.addEventListener("scroll", disableAutoScroll, { passive: true });
            document.addEventListener("keydown", (e) => {
                if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " "].includes(e.key)) {
                    disableAutoScroll();
                }
            }, { passive: true });
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
                    if (cover) cover.scrollIntoView({ behavior: "auto", block: "start" });
                } else {
                    const wrapper = document.getElementById(`chapter-wrap-${this.currentChapterIndex}`);
                    if (wrapper) {
                        wrapper.scrollIntoView({ behavior: "auto", block: "start" });
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
        if (!voiceSelect || !('speechSynthesis' in window)) return;

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
                        
                        // Limit/eager load only up to the next 3 chapters from the active position
                        for (let i = idx; i <= idx + 3; i++) {
                            this.lazyLoadChapter(i);
                        }
                    }
                    this.updateActiveTocHighlight();
                }
            });
        }, activeOptions);

        // 2. Observer for prefetching and lazy loading chapter placeholders early
        const lazyOptions = {
            root: document.getElementById("epubReaderViewport"),
            rootMargin: this.prefersInstantScroll() ? "-20px 0px 300px 0px" : "-40px 0px 600px 0px", // Trigger early loading when scrolling towards it
            threshold: 0
        };

        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            if (this.isNavigatingToChapter) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = parseInt(entry.target.dataset.index);
                    if (idx >= 0 && entry.target.classList.contains("placeholder-loading")) {
                        // Enforce scroll view constraint: only load if it is within the next 3 chapters
                        if (idx <= this.currentChapterIndex + 3) {
                            this.lazyLoadChapter(idx);
                        }
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
                <div class="reader-cover-author" style="font-size:1.25rem; color:var(--reader-muted);">${this.isLazyScraped ? "Source:" : "By"} ${this.metaInfo.author || "Unknown Author"}</div>
                <div style="margin-top: 30px; color: var(--primary, #00f5ff); font-weight: 700; font-size: 0.95rem; letter-spacing: 0.05em;">
                    SCROLL DOWN TO START READING ↓
                </div>
            </div>
        `;
        contentBody.appendChild(coverWrapper);
        if (this.observer) this.observer.observe(coverWrapper);

        // 2. Render chapter placeholders — virtualized for live-scraped books
        //    Only create the first lazyVirtualScrollBatchSize nodes to keep the DOM light.
        //    For local EPUB files, create all placeholders as before (typically small chapter counts).
        const renderLimit = (this.isLazyScraped && this.toc.length > this.lazyVirtualScrollBatchSize)
            ? this.lazyVirtualScrollBatchSize
            : this.toc.length;

        this.toc.slice(0, renderLimit).forEach((chapter, index) => {
            this._createChapterPlaceholder(contentBody, chapter, index);
        });
        this.lazyDomRenderedCount = renderLimit;

        // 3. If there are more chapters beyond the initial batch, attach a sentinel
        //    element that auto-appends more placeholders as the user scrolls.
        if (this.isLazyScraped && this.toc.length > renderLimit) {
            this._attachVirtualScrollSentinel(contentBody);
        }
    }

    /** Build and attach a sentinel div that appends the next batch of placeholders when scrolled into view. */
    _attachVirtualScrollSentinel(contentBody) {
        // Remove existing sentinel first
        const existing = document.getElementById("liveScrollSentinel");
        if (existing) existing.remove();

        const sentinel = document.createElement("div");
        sentinel.id = "liveScrollSentinel";
        sentinel.style.cssText = "height:60px; display:flex; align-items:center; justify-content:center; color:var(--reader-muted); font-size:0.85rem;";
        sentinel.textContent = `${this.toc.length - this.lazyDomRenderedCount} more chapters below…`;
        contentBody.appendChild(sentinel);

        const sentinelObs = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            sentinelObs.disconnect();
            sentinel.remove();
            this._appendNextVirtualBatch(contentBody);
        }, {
            root: document.getElementById("epubReaderViewport"),
            rootMargin: "0px 0px 400px 0px"
        });
        sentinelObs.observe(sentinel);
    }

    /** Append the next batch of chapter placeholders and re-attach sentinel if more remain. */
    _appendNextVirtualBatch(contentBody) {
        const start = this.lazyDomRenderedCount;
        const end = Math.min(start + this.lazyVirtualScrollBatchSize, this.toc.length);
        for (let i = start; i < end; i++) {
            this._createChapterPlaceholder(contentBody, this.toc[i], i);
        }
        this.lazyDomRenderedCount = end;
        if (end < this.toc.length) {
            this._attachVirtualScrollSentinel(contentBody);
        }
    }

    /** Create a single chapter placeholder div and append it to contentBody. */
    _createChapterPlaceholder(contentBody, chapter, index) {
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
    }

    /** Incrementally append chapter placeholder divs for the live reader streaming flow. */
    appendScrollPlaceholders(chapters, startIndex) {
        const contentBody = document.getElementById("epubReaderContentBody");
        if (!contentBody) return;
        // Remove existing sentinel to re-insert after new placeholders
        const sentinel = document.getElementById("liveScrollSentinel");
        if (sentinel) sentinel.remove();
        chapters.forEach((chapter, i) => {
            const index = startIndex + i;
            if (document.getElementById(`chapter-wrap-${index}`)) return; // already exists
            this._createChapterPlaceholder(contentBody, chapter, index);
        });
        this.lazyDomRenderedCount = startIndex + chapters.length;
        // Re-attach sentinel if more unrendered chapters exist
        if (this.lazyDomRenderedCount < this.toc.length) {
            this._attachVirtualScrollSentinel(contentBody);
        }
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
            this.showLoader("Parsing Ebook Elements...");

            await this.ensureZipAvailable();


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

            this.currentZipReader = new zip.ZipReader(zipReaderSource, { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) });
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

    /**
     * Incrementally append a batch of TOC items to the sidebar.
     * Called during live reader streaming so chapters appear in the sidebar
     * as they are discovered, without rebuilding the full list.
     * @param {Array} chapters  – array of { title, href } objects
     * @param {number} startIndex – global index of the first item in this batch
     */
    appendToSidebarToc(chapters, startIndex) {
        const tocList = document.getElementById("readerTocList");
        if (!tocList) return;
        // Remove "loading" placeholder if present
        const loadingItem = document.getElementById("toc-loading-item");
        if (loadingItem) loadingItem.remove();

        chapters.forEach((item, i) => {
            const index = startIndex + i;
            // Avoid duplicate
            if (tocList.querySelector(`[data-index="${index}"]`)) return;
            const li = document.createElement("li");
            li.className = "toc-item";
            li.textContent = item.title;
            li.dataset.index = index;
            if (item.href) li.title = item.href;
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
                coverWrapper.scrollIntoView({ behavior: "auto", block: "start" });
                this.navigationTimeout = setTimeout(() => {
                    this.isNavigatingToChapter = false;
                    this._reobservePlaceholders();
                }, 100);
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
        const wasTtsActive = this.ttsActive;
        this.stopTTS();

        if (this.layout === "scroll") {
            this.currentChapterIndex = index;
            
            // Check if scroll viewport is already initialized (has wrappers)
            const firstChapterWrap = document.getElementById("chapter-wrap-0");
            if (!firstChapterWrap) {
                this.showLoader("Initializing Reader...");
                this.initializeScrollViewport();
                this.hideLoader();
            }

            // Scroll the target chapter placeholder into view smoothly
            const wrapper = document.getElementById(`chapter-wrap-${index}`);
            if (wrapper) {
                this.isNavigatingToChapter = true;
                if (this.navigationTimeout) clearTimeout(this.navigationTimeout);

                // Force immediate lazy load of target chapter first so it expands and stabilizes the layout
                if (wrapper.classList.contains("placeholder-loading")) {
                    await this.lazyLoadChapter(index);
                }

                // Scroll the target chapter (now fully loaded and stable) into view instantly
                wrapper.scrollIntoView({ behavior: "auto", block: "start" });

                this.navigationTimeout = setTimeout(() => {
                    this.isNavigatingToChapter = false;
                    this._reobservePlaceholders();
                }, 100);
            }
            this.currentChapterIndex = index;
            this.updateActiveTocHighlight();
            if (wasTtsActive) {
                setTimeout(() => this.playTTS(), 300);
            }
            return;
        }


        this.showLoader("Parsing Ebook Elements...");

        
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

            if (wasTtsActive) {
                setTimeout(() => this.playTTS(), 300);
            }

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
                // We no longer bind per-element click listeners here. Event delegation is used in bindEvents.
            }
        });
    }

    playTTS() {
        this.prepareTTSParagraphs();
        if (this.ttsParagraphs.length === 0 || !('speechSynthesis' in window)) return;

        let needsSync = false;
        if (this.ttsCurrentIndex >= 0 && this.ttsCurrentIndex < this.ttsParagraphs.length) {
            const p = this.ttsParagraphs[this.ttsCurrentIndex].element;
            const rect = p.getBoundingClientRect();
            const vHeight = window.innerHeight || document.documentElement.clientHeight;
            if (rect.bottom < 0 || rect.top > vHeight) {
                needsSync = true;
            }
        } else {
            needsSync = true;
        }

        if (needsSync) {
            const vHeight = window.innerHeight || document.documentElement.clientHeight;
            const offset = 60; // rough header height
            for (let i = 0; i < this.ttsParagraphs.length; i++) {
                const rect = this.ttsParagraphs[i].element.getBoundingClientRect();
                if ((rect.top >= offset && rect.top < vHeight) || (rect.top < offset && rect.bottom > offset)) {
                    this.ttsCurrentIndex = i;
                    break;
                }
            }
        }

        if (window.speechSynthesis.paused && this.ttsActive) {
            if (needsSync) {
                window.speechSynthesis.cancel();
                this.ttsActive = false;
            } else {
                window.speechSynthesis.resume();
                document.getElementById("ttsPlayBtn").style.display = "none";
                document.getElementById("ttsPauseBtn").style.display = "inline-flex";
                this.ttsAutoScroll = true;
                return;
            }
        }

        this.stopTTS(); // clear active speech
        this.ttsActive = true;
        this.ttsAutoScroll = true; // reset auto-scroll on play

        const contentBody = document.getElementById("epubReaderContentBody");
        if (contentBody) {
            contentBody.classList.add("tts-mode-active");
        }
        
        document.getElementById("ttsPlayBtn").style.display = "none";
        document.getElementById("ttsPauseBtn").style.display = "inline-flex";

        if (this.ttsParagraphs && this.ttsParagraphs.length > 0) {
            let targetIdx = 0;
            const viewportHeight = window.innerHeight;
            for (let i = 0; i < this.ttsParagraphs.length; i++) {
                const rect = this.ttsParagraphs[i].element.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < viewportHeight) {
                    targetIdx = i;
                    break;
                }
            }
            this.ttsCurrentIndex = targetIdx;
        }

        if (this.ttsCurrentIndex >= this.ttsParagraphs.length) this.ttsCurrentIndex = 0;
        this.speakCurrentParagraph();
    }

    speakCurrentParagraph() {
        // Refresh paragraphs to account for newly loaded chapters
        this.prepareTTSParagraphs();
        
        if (!this.ttsActive || this.ttsCurrentIndex >= this.ttsParagraphs.length || !('speechSynthesis' in window)) {
            this.stopTTS();
            return;
        }

        // Highlight Active Block
        this.ttsParagraphs.forEach(p => p.element.classList.remove("tts-active-paragraph"));
        const activeBlock = this.ttsParagraphs[this.ttsCurrentIndex];
        this.currentTtsElement = activeBlock.element;
        activeBlock.element.classList.add("tts-active-paragraph");

        // Scroll highlight paragraph into view smoothly if in scroll mode
        if (this.layout === "scroll" && this.ttsAutoScroll !== false) {
            this.isAutoScrolling = true;
            activeBlock.element.scrollIntoView({ behavior: this.prefersInstantScroll() ? "auto" : "smooth", block: "center" });
            setTimeout(() => this.isAutoScrolling = false, 250);
        } else if (this.layout === "page-turn" && this.ttsAutoScroll !== false) {
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

        // Clear previous utterance handlers and cancel active speech to cleanly jump
        if (this.speechUtterance) {
            this.speechUtterance.onend = null;
            this.speechUtterance.onerror = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
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
        
        const rateInput = document.getElementById("ttsRateInput");
        const pitchInput = document.getElementById("ttsPitchInput");
        this.speechUtterance.rate = rateInput ? parseFloat(rateInput.value) : 1;
        this.speechUtterance.pitch = pitchInput ? parseFloat(pitchInput.value) : 1;

        this.speechUtterance.onend = () => {
            if (!this.ttsActive) return;
            // Re-evaluate current index based on the DOM
            this.prepareTTSParagraphs();
            const currentIdx = this.ttsParagraphs.findIndex(p => p.element === this.currentTtsElement);
            if (currentIdx !== -1) {
                this.ttsCurrentIndex = currentIdx + 1;
            } else {
                let targetIdx = 0;
                for (let i = 0; i < this.ttsParagraphs.length; i++) {
                    const rect = this.ttsParagraphs[i].element.getBoundingClientRect();
                    if (rect.bottom > 0) {
                        targetIdx = i;
                        break;
                    }
                }
                this.ttsCurrentIndex = targetIdx;
            }
            this.speakCurrentParagraph();
        };

        this.speechUtterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            if (this.ttsActive) this.stopTTS();
        };

        window.speechSynthesis.speak(this.speechUtterance);
    }

    pauseTTS() {
        if (!('speechSynthesis' in window)) return;
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            document.getElementById("ttsPauseBtn").style.display = "none";
            document.getElementById("ttsPlayBtn").style.display = "inline-flex";
        }
    }

    stopTTS() {
        this.ttsActive = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        
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

    showLoader(message) {
        const loader = document.getElementById("epubReaderLoader");
        const loaderText = document.getElementById("epubLoaderText");
        if (loaderText) {
            loaderText.textContent = message || "Parsing Ebook Elements...";
        }
        if (loader) loader.style.display = "flex";
    }

    hideLoader() {
        const loader = document.getElementById("epubReaderLoader");
        if (loader) loader.style.display = "none";
    }

    async withTimeout(promise, timeoutMs, timeoutMessage) {
        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        }
    }

    static _zipFileName() {
        const isWebsite = !!(typeof window !== "undefined" && window.WTE_WEBSITE_MODE);
        const noWorkerLoaded = typeof document !== "undefined"
            && document.querySelector("script[src*=\"zip-no-worker.min.js\"]");
        if (isWebsite || noWorkerLoaded) {
            return "zip-no-worker.min.js";
        }
        return (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers())
            ? "zip.min.js"
            : "zip-no-worker.min.js";
    }

    static _zipDistCandidates() {
        const zipFile = EpubViewerUI._zipFileName();
        const urls = [];
        const seen = new Set();
        const add = (url) => {
            if (!url || seen.has(url)) {
                return;
            }
            seen.add(url);
            urls.push(url);
        };

        if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
            add(chrome.runtime.getURL(`@zip.js/zip.js/dist/${zipFile}`));
        }

        const path = window.location.pathname || "/";
        const inPluginDir = /\/plugin(?:\/|$)/.test(path);
        const relative = `${inPluginDir ? "" : "plugin/"}@zip.js/zip.js/dist/${zipFile}`;
        try {
            add(new URL(relative, window.location.href).href);
        } catch (_) { /* ignore */ }

        if (!inPluginDir) {
            try {
                add(new URL(`@zip.js/zip.js/dist/${zipFile}`, window.location.href).href);
            } catch (_) { /* ignore */ }
        }

        add(`https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.44/dist/${zipFile}`);
        return urls;
    }

    static _configureZipRuntime() {
        if (typeof zip === "undefined") {
            return;
        }
        const useWorkers = EpubViewerUI._zipFileName() === "zip.min.js";
        if (useWorkers) {
            const inPluginDir = /\/plugin(?:\/|$)/.test(window.location.pathname || "/");
            const workerPath = inPluginDir ? "@zip.js/zip.js/dist/" : "plugin/@zip.js/zip.js/dist/";
            if (zip.configure) {
                zip.configure({ useWebWorkers: true, workerScriptsPath: workerPath });
            } else {
                zip.useWebWorkers = true;
                zip.workerScriptsPath = workerPath;
            }
            return;
        }
        if (zip.configure) {
            zip.configure({ useWebWorkers: false });
        } else {
            zip.useWebWorkers = false;
        }
    }

    async ensureZipAvailable() {
        if (typeof zip !== "undefined") {
            EpubViewerUI._configureZipRuntime();
            return;
        }

        for (const src of EpubViewerUI._zipDistCandidates()) {
            try {
                await new Promise((resolve, reject) => {
                    const existing = document.querySelector(`script[data-wte-zip-loader="true"][src="${src}"]`);
                    if (existing) {
                        if (typeof zip !== "undefined") {
                            resolve();
                            return;
                        }
                        existing.addEventListener("load", () => resolve(), { once: true });
                        existing.addEventListener("error", () => reject(new Error(`Failed loading zip.js from ${src}`)), { once: true });
                        return;
                    }

                    const script = document.createElement("script");
                    script.src = src;
                    script.async = true;
                    script.dataset.wteZipLoader = "true";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error(`Failed loading zip.js from ${src}`));
                    document.head.appendChild(script);
                });

                if (typeof zip !== "undefined") {
                    EpubViewerUI._configureZipRuntime();
                    return;
                }
            } catch (error) {
                console.warn("[EPUB Reader] zip.js load attempt failed:", error);
            }
        }

        throw new Error("zip.js failed to load. Please refresh and try again.");
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

