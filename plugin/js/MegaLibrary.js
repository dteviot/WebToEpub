"use strict";

class MegaLibrary {
    constructor() {
        this.currentFolder = null;
    }

    init() {
        // Expose instance globally
        window.megaLibrary = this;
        this.epubFiles = [];
        this.searchQuery = "";
        
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

    showMegaSection() {
        // Hide other sections
        const sectionsToHide = [
            "hiddenBibSection", 
            "advancedOptionsSection", 
            "searchEngineSection",
            "testSection",
            "imageSection",
            "manualSection"
        ];
        
        sectionsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        
        // Hide URL/Fetch sections for live/manual modes
        const fetchSection = document.getElementById("urlInput");
        if (fetchSection && fetchSection.parentElement) {
            fetchSection.parentElement.hidden = true;
        }

        // Show mega section
        const megaSection = document.getElementById("megaLibrarySection");
        if (megaSection) {
            megaSection.hidden = false;
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

        statusEl.textContent = "Loading folder metadata...";
        statusEl.style.color = "#a78bfa";
        grid.innerHTML = "";

        try {
            // Using megajs browser build
            const folder = await mega.File.fromURL(url);
            await folder.loadAttributes();
            this.currentFolder = folder;
            
            statusEl.textContent = `Folder loaded: ${folder.name || "Unknown Folder"}. Scanning for EPUBs...`;
            
            const epubFiles = [];
            
            // Function to recursively scan folder
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
                statusEl.textContent = "No EPUB files found in this folder.";
                statusEl.style.color = "orange";
                return;
            }
            
            // Sort alphabetically
            epubFiles.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            
            this.epubFiles = epubFiles;
            this.renderGrid();
            
        } catch (error) {
            console.error("Mega folder load error:", error);
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = "red";
        }
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
            statusEl.textContent = `Found ${filtered.length} EPUB files.`;
            statusEl.style.color = "#10b981";
        }
        
        filtered.forEach((file, index) => {
            const title = file.name.replace(/\.epub$/i, "");
            
            const card = document.createElement("div");
            card.className = "book-card";
            
            card.innerHTML = `
                <div class="book-cover-wrap">
                    <!-- Placeholder cover for Mega files -->
                    <div class="book-cover-placeholder" style="background: linear-gradient(135deg, #2d2d2d, #1a1a1a); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #666; font-size: 3rem;">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                    </div>
                    <div class="book-overlay-actions">
                        <button class="book-action-btn read-btn-main">Read Now</button>
                        <button class="book-action-btn download-btn-main">Save File</button>
                    </div>
                </div>
                <div class="book-details">
                    <div class="book-title" title="${title.replace(/"/g, "&quot;")}">${title}</div>
                    <div class="book-author">Mega.nz File</div>
                    <p class="book-desc-text" style="font-size:0.8rem; color:var(--text-muted); line-height: 1.4; margin: 8px 0 0; overflow:hidden; display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">Size: ${this.formatSize(file.size)}<br><br><i>Note: Mega library EPUBs do not contain cached covers or descriptions.</i></p>
                </div>
            `;
            
            const dlBtn = card.querySelector(".download-btn-main");
            dlBtn.addEventListener("click", () => this.downloadFile(file, dlBtn));
            
            const readBtn = card.querySelector(".read-btn-main");
            readBtn.addEventListener("click", () => this.readOnline(file, readBtn));
            
            card.querySelector(".book-cover-wrap").addEventListener("click", (e) => {
                if (e.target.classList.contains("book-action-btn")) return;
                this.readOnline(file, readBtn);
            });
            
            grid.appendChild(card);
        });
    }
    
    async downloadFile(file, btnElement) {
        if (btnElement.disabled) return;
        
        const originalText = btnElement.textContent;
        btnElement.textContent = "Downloading...";
        btnElement.disabled = true;
        btnElement.style.background = "#555";
        
        try {
            const data = await file.downloadBuffer();
            // Data is Uint8Array or Buffer, we convert to Blob
            const blob = new Blob([data], { type: "application/epub+zip" });
            const url = URL.createObjectURL(blob);
            
            // Trigger download via anchor element
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name || "download.epub";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            
            btnElement.textContent = "Done";
            btnElement.style.background = "#10b981"; // success green
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.disabled = false;
                btnElement.style.background = "";
            }, 3000);
        } catch (error) {
            console.error("Mega download error:", error);
            btnElement.textContent = "Error";
            btnElement.style.background = "red";
            alert("Failed to download file: " + error.message);
            
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.disabled = false;
                btnElement.style.background = "";
            }, 3000);
        }
    }
    
    async readOnline(file, btnElement) {
        if (btnElement.disabled) return;
        
        const originalText = btnElement.textContent;
        btnElement.textContent = "Loading...";
        btnElement.disabled = true;
        btnElement.style.background = "#555";
        
        // Show the global loader so user knows what's happening
        const loader = document.getElementById("libraryLoader");
        if (loader) {
            loader.style.display = "flex";
            const statusText = loader.querySelector("div:last-child");
            if (statusText) statusText.textContent = "Downloading EPUB from Mega...";
        }
        
        try {
            const data = await file.downloadBuffer();
            const blob = new Blob([data], { type: "application/epub+zip" });
            
            // Monkeypatch the blob so it has a name property, needed by loadEpubFile
            blob.name = file.name || "book.epub";
            
            if (window.libraryManager && window.libraryManager.loadEpubFile) {
                // Let the library manager handle loading the blob into the reader
                window.libraryManager.loadEpubFile(blob);
            } else {
                throw new Error("Library manager not available to load epub");
            }
            
            btnElement.textContent = "Ready";
            btnElement.style.background = "#10b981"; // success green
            
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.disabled = false;
                btnElement.style.background = "";
            }, 3000);
            
        } catch (error) {
            console.error("Mega read online error:", error);
            btnElement.textContent = "Error";
            btnElement.style.background = "red";
            alert("Failed to read file: " + error.message);
            
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.disabled = false;
                btnElement.style.background = "";
            }, 3000);
            
            const loader = document.getElementById("libraryLoader");
            if (loader) loader.style.display = "none";
        }
    }
    
    formatSize(bytes) {
        if (!bytes || bytes === 0) return "Unknown";
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize on DOMContentLoaded or if already loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.megaLibrary = new MegaLibrary();
        window.megaLibrary.init();
    });
} else {
    window.megaLibrary = new MegaLibrary();
    window.megaLibrary.init();
}
