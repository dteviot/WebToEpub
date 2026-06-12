"use strict";

class MegaLibrary {
    constructor() {
        this.currentFolder = null;
        this.epubFiles = [];
        this.searchQuery = "";
        this.currentLoadToken = null;
    }

    init() {
        window.megaLibrary = this;

        const searchInput = document.getElementById("megaLibrarySearch");
        const clearBtn = document.getElementById("clearMegaSearch");

        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                if (clearBtn) {
                    clearBtn.style.display = this.searchQuery.length > 0 ? "flex" : "none";
                }
                this.renderGrid();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                this.searchQuery = "";
                clearBtn.style.display = "none";
                this.renderGrid();
            });
        }
    }

    async loadFolder(url) {
        const statusEl = document.getElementById("megaLibraryStatus");
        const grid = document.getElementById("megaLibraryGrid");

        if (!statusEl || !grid) return;

        if (!url) {
            statusEl.textContent = "Please enter a valid Mega folder URL.";
            statusEl.style.color = "red";
            return;
        }

        // Show loading skeleton
        statusEl.textContent = "Loading folder…";
        statusEl.style.color = "#a78bfa";
        grid.innerHTML = this._skeletonHTML();

        try {
            const folder = await mega.File.fromURL(url);
            await folder.loadAttributes();
            this.currentFolder = folder;

            statusEl.textContent = `Scanning for EPUBs in "${folder.name || "Mega Folder"}"…`;

            const epubFiles = [];
            const scanChildren = (parent) => {
                if (!parent.children) return;
                for (const child of parent.children) {
                    if (child.directory) {
                        scanChildren(child);
                    } else if (child.name && child.name.toLowerCase().endsWith(".epub")) {
                        epubFiles.push(child);
                    }
                }
            };
            scanChildren(folder);

            if (epubFiles.length === 0) {
                grid.innerHTML = "";
                statusEl.textContent = "No EPUB files found in this folder.";
                statusEl.style.color = "orange";
                return;
            }

            epubFiles.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            this.epubFiles = epubFiles;
            this.renderGrid();

        } catch (error) {
            console.error("Mega folder load error:", error);
            grid.innerHTML = "";
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = "#f87171";
        }
    }

    _skeletonHTML() {
        return Array.from({ length: 6 }).map(() => `
            <div class="mega-book-row skeleton-row" style="display:flex; gap:16px; padding:16px; border-radius:12px; background:rgba(255,255,255,0.03); margin-bottom:12px; animation: pulse 1.5s ease-in-out infinite;">
                <div style="width:70px; height:100px; border-radius:8px; background:#2a2a35; flex-shrink:0;"></div>
                <div style="flex:1; display:flex; flex-direction:column; gap:10px; justify-content:center;">
                    <div style="height:14px; width:60%; border-radius:6px; background:#2a2a35;"></div>
                    <div style="height:11px; width:35%; border-radius:6px; background:#222230;"></div>
                    <div style="height:10px; width:85%; border-radius:6px; background:#222230;"></div>
                    <div style="height:10px; width:70%; border-radius:6px; background:#222230;"></div>
                </div>
            </div>
        `).join("");
    }

    renderGrid() {
        const grid = document.getElementById("megaLibraryGrid");
        const statusEl = document.getElementById("megaLibraryStatus");
        if (!grid) return;

        grid.innerHTML = "";

        const filtered = this.epubFiles.filter(f => {
            if (!this.searchQuery) return true;
            return (f.name || "").toLowerCase().includes(this.searchQuery);
        });

        if (statusEl) {
            statusEl.textContent = `${filtered.length} EPUB${filtered.length !== 1 ? "s" : ""} found`;
            statusEl.style.color = "#10b981";
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin:0 auto 16px;display:block;opacity:0.4;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"/>
                    </svg>
                    <p style="font-size:1rem; margin:0;">No books match your search.</p>
                </div>`;
            return;
        }

        filtered.forEach((file) => {
            const title = file.name.replace(/\.epub$/i, "");
            const sizeStr = this.formatSize(file.size);

            // Generate a deterministic color from title for cover gradient
            const hue = this._titleToHue(title);
            const gradient = `linear-gradient(145deg, hsl(${hue},55%,22%), hsl(${(hue+40)%360},45%,14%))`;

            const row = document.createElement("div");
            row.className = "mega-book-row";
            row.style.cssText = `
                display: flex;
                gap: 16px;
                padding: 14px 16px;
                border-radius: 12px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                margin-bottom: 10px;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s, transform 0.1s;
                position: relative;
                overflow: hidden;
            `;

            row.innerHTML = `
                <!-- Cover Poster -->
                <div class="mega-cover" style="
                    width: 72px;
                    min-width: 72px;
                    height: 104px;
                    border-radius: 8px;
                    background: ${gradient};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    position: relative;
                ">
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" style="width:28px;height:28px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    <div style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:6px; text-transform:uppercase; letter-spacing:0.05em;">EPUB</div>
                </div>

                <!-- Info Column -->
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div class="mega-title" style="
                            font-size: 0.95rem;
                            font-weight: 700;
                            color: var(--reader-text, #f0f0f0);
                            line-height: 1.35;
                            margin-bottom: 4px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        " title="${title.replace(/"/g,"&quot;")}">${title}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted,#888); margin-bottom:8px;">
                            Mega.nz · <span style="color:#a78bfa;">${sizeStr}</span>
                        </div>
                        <div class="mega-description" style="
                            font-size: 0.8rem;
                            color: var(--text-muted,#888);
                            line-height: 1.5;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                        ">Tap to read this EPUB directly from the Mega cloud. No account required.</div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <button class="mega-read-btn" style="
                            flex:1;
                            padding: 7px 0;
                            border-radius: 20px;
                            border: none;
                            background: hsl(${hue},60%,30%);
                            color: #fff;
                            font-size: 0.82rem;
                            font-weight: 700;
                            cursor: pointer;
                            transition: background 0.15s, transform 0.1s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 5px;
                        ">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px;">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                            </svg>
                            Read Live
                        </button>
                        <button class="mega-dl-btn" style="
                            flex:1;
                            padding: 7px 0;
                            border-radius: 20px;
                            border: 1px solid rgba(255,255,255,0.1);
                            background: rgba(255,255,255,0.06);
                            color: #ccc;
                            font-size: 0.82rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: background 0.15s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 5px;
                        ">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px;">
                                <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3zm-7.25 13.5a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z" clip-rule="evenodd"/>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            `;

            // Hover effect
            row.addEventListener("mouseenter", () => {
                row.style.background = "rgba(255,255,255,0.06)";
                row.style.borderColor = `hsl(${hue},50%,35%)`;
            });
            row.addEventListener("mouseleave", () => {
                row.style.background = "rgba(255,255,255,0.03)";
                row.style.borderColor = "rgba(255,255,255,0.06)";
            });

            const readBtn = row.querySelector(".mega-read-btn");
            const dlBtn = row.querySelector(".mega-dl-btn");

            readBtn.addEventListener("click", (e) => { e.stopPropagation(); this.readOnline(file, readBtn); });
            dlBtn.addEventListener("click", (e) => { e.stopPropagation(); this.downloadFile(file, dlBtn); });

            // Tapping the row (not a button) triggers read
            row.addEventListener("click", (e) => {
                if (!e.target.closest("button")) this.readOnline(file, readBtn);
            });

            grid.appendChild(row);
        });
    }

    _titleToHue(title) {
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = (hash << 5) - hash + title.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 360;
    }

    async downloadFile(file, btnElement) {
        if (btnElement.disabled) return;
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = "<svg viewBox=\"0 0 20 20\" fill=\"currentColor\" style=\"width:13px;height:13px;animation:spin 1s linear infinite;\"><path fill-rule=\"evenodd\" d=\"M10 3a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3zm-7.25 13.5a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z\" clip-rule=\"evenodd\"/></svg> Downloading…";
        btnElement.disabled = true;
        btnElement.style.opacity = "0.7";

        try {
            const data = await file.downloadBuffer();
            const blob = new Blob([data], { type: "application/epub+zip" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name || "download.epub";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            btnElement.innerHTML = "✓ Saved";
            btnElement.style.background = "#10b981";
            btnElement.style.color = "#fff";
            btnElement.style.border = "none";
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.disabled = false;
                btnElement.style.opacity = "";
                btnElement.style.background = "";
                btnElement.style.color = "";
                btnElement.style.border = "";
            }, 2500);
        } catch (error) {
            console.error("Mega download error:", error);
            btnElement.innerHTML = "✗ Failed";
            btnElement.style.background = "#dc2626";
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.disabled = false;
                btnElement.style.opacity = "";
                btnElement.style.background = "";
            }, 3000);
        }
    }

    async readOnline(file, btnElement) {
        if (btnElement.disabled) return;

        const loadToken = Date.now();
        this.currentLoadToken = loadToken;

        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `
            <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px;animation:spin 1s linear infinite;">
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/>
            </svg> Downloading…`;
        btnElement.disabled = true;
        btnElement.style.opacity = "0.7";

        const bookTitle = file.name.replace(/\.epub$/i, "");

        // Show the library loader overlay — user stays on library page during download
        const loader = document.getElementById("libraryLoader");
        const cancelBtn = document.getElementById("cancelLibraryLoadBtn");
        let cancelled = false;

        const resetBtn = () => {
            btnElement.innerHTML = originalHTML;
            btnElement.disabled = false;
            btnElement.style.opacity = "";
            btnElement.style.background = "";
            btnElement.style.color = "";
            btnElement.style.border = "";
        };

        const onCancel = () => {
            cancelled = true;
            this.currentLoadToken = null;
            if (loader) loader.style.display = "none";
            if (cancelBtn) { cancelBtn.style.display = "none"; cancelBtn.onclick = null; }
            resetBtn();
        };

        if (loader) {
            // Update loader text to give context
            const spinnerEl = loader.querySelector(".spinner-ring");
            const textEl = loader.querySelector("div:not(.spinner-ring)") || loader.querySelector("div:last-child");

            // Re-inject loader content with progress info
            loader.innerHTML = `
                <div class="spinner-ring"></div>
                <div style="color:var(--primary,#a78bfa); font-weight:700; font-size:1rem; text-align:center; max-width:300px; line-height:1.5;">
                    Downloading EPUB from Mega…<br>
                    <span style="font-size:0.82rem; color:var(--text-muted,#888); font-weight:400;">"${bookTitle}"</span>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted,#888); margin-top:4px;">Large files may take a moment</div>
                <button id="cancelLibraryLoadBtn" class="book-action-btn download-btn-main" style="display:inline-block; width:auto; padding:6px 20px; margin-top:14px; font-size:0.85rem;">Cancel</button>
            `;
            loader.style.display = "flex";

            const newCancelBtn = document.getElementById("cancelLibraryLoadBtn");
            if (newCancelBtn) newCancelBtn.onclick = onCancel;
        }

        // Yield to let the loader paint before starting the potentially long download
        await new Promise(r => setTimeout(r, 60));

        try {
            const data = await file.downloadBuffer();

            if (this.currentLoadToken !== loadToken || cancelled) return;

            const blob = new Blob([data], { type: "application/epub+zip" });
            blob.name = file.name || "book.epub";

            // Hide the download loader — openBookInReader will show the reader loader
            if (loader) loader.style.display = "none";

            // Update button briefly to show success before view switch
            btnElement.innerHTML = "✓ Opening…";
            btnElement.style.background = "#10b981";
            btnElement.style.color = "#fff";
            btnElement.style.border = "none";
            btnElement.style.opacity = "1";

            // Small delay so the user sees the success state before transition
            await new Promise(r => setTimeout(r, 150));

            // Now open in reader — openBookInReader will show epubReaderLoader
            // BEFORE switching views so there's no black screen
            if (window.libraryManager && typeof window.libraryManager.openBookInReader === "function") {
                window.libraryManager.openBookInReader(blob);
            } else {
                // Fallback direct path using window.showView for proper display:block
                const readerLoader = document.getElementById("epubReaderLoader");
                const readerLoaderText = document.getElementById("epubLoaderText");
                if (readerLoader) {
                    if (readerLoaderText) readerLoaderText.textContent = "Loading EPUB…";
                    readerLoader.style.display = "flex";
                }
                const viewer = window.epubViewer || window.epubViewerInstance;
                if (typeof window.showView === "function") {
                    window.showView("epubReaderView").then(() => {
                        if (viewer) viewer.loadEpub(blob);
                    });
                } else {
                    const rv = document.getElementById("epubReaderView");
                    if (rv) { rv.style.display = "block"; rv.classList.add("active"); }
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        if (viewer) viewer.loadEpub(blob);
                    }));
                }
            }


            // Reset button state after a moment (view has already changed)
            setTimeout(resetBtn, 2000);

        } catch (error) {
            if (this.currentLoadToken !== loadToken || cancelled) return;
            console.error("Mega read online error:", error);

            if (loader) loader.style.display = "none";

            resetBtn();
            btnElement.innerHTML = "✗ Failed";
            btnElement.style.background = "#dc2626";
            btnElement.style.opacity = "1";
            setTimeout(resetBtn, 3000);

            alert("Failed to load EPUB: " + error.message);
        }
    }

    formatSize(bytes) {
        if (!bytes || bytes === 0) return "Unknown";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }
}

// Initialize
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.megaLibrary = new MegaLibrary();
        window.megaLibrary.init();
    });
} else {
    window.megaLibrary = new MegaLibrary();
    window.megaLibrary.init();
}
