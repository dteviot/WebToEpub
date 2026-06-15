/* Archive Library Integration */
"use strict";

class ArchiveLibrary {
    constructor() {
        this.folders = {}; // Map of folderName -> Array of files
        this.isLoaded = false;
        this.currentFolder = null;
        this.searchQuery = "";
        
        // Base URL for the archive XML and downloads
        this.XML_URL = "data/offtllnls_files.xml";
        this.DOWNLOAD_BASE = "https://archive.org/download/offtllnls/";
    }

    async loadRoot() {
        if (this.isLoaded) {
            this.renderFolders();
            return;
        }

        const loader = document.getElementById("libraryLoader");
        if (loader) loader.style.display = "flex";

        try {
            const response = await fetch(this.XML_URL);
            if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            const fileNodes = xmlDoc.getElementsByTagName("file");
            this.folders = {};

            for (let i = 0; i < fileNodes.length; i++) {
                const node = fileNodes[i];
                const formatNode = node.getElementsByTagName("format")[0];
                if (!formatNode || formatNode.textContent !== "EPUB") continue;

                const nameAttr = node.getAttribute("name");
                if (!nameAttr) continue;

                const parts = nameAttr.split("/");
                if (parts.length < 2) continue; // Skip files at the root

                const folderName = parts[0];
                const fileName = parts.slice(1).join("/");
                
                const sizeNode = node.getElementsByTagName("size")[0];
                const size = sizeNode ? parseInt(sizeNode.textContent, 10) : 0;

                if (!this.folders[folderName]) {
                    this.folders[folderName] = [];
                }
                
                this.folders[folderName].push({
                    name: fileName,
                    path: nameAttr,
                    size: size,
                    url: this.DOWNLOAD_BASE + encodeURIComponent(folderName) + "/" + encodeURIComponent(fileName)
                });
            }

            this.isLoaded = true;
            this.setupSearch();
            this.setupBreadcrumb();
            this.renderFolders();
            
        } catch (error) {
            console.error("ArchiveLibrary: Failed to load XML", error);
            const grid = document.getElementById("archiveLibraryGrid");
            if (grid) grid.innerHTML = `<div style="padding: 20px; color: #ff6b6b; font-weight: 600;">Failed to load Archive.org library.</div>`;
        } finally {
            if (loader) loader.style.display = "none";
        }
    }

    setupSearch() {
        const searchInput = document.getElementById("archiveLibrarySearch");
        const clearBtn = document.getElementById("clearArchiveSearch");

        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                if (clearBtn) clearBtn.style.display = this.searchQuery ? "flex" : "none";
                
                if (this.currentFolder) {
                    this.renderFiles(this.currentFolder);
                } else {
                    this.renderFolders();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                this.searchQuery = "";
                clearBtn.style.display = "none";
                
                if (this.currentFolder) {
                    this.renderFiles(this.currentFolder);
                } else {
                    this.renderFolders();
                }
            });
        }
    }

    setupBreadcrumb() {
        const rootBtn = document.getElementById("archiveBreadcrumbRoot");
        if (rootBtn) {
            rootBtn.addEventListener("click", () => {
                this.currentFolder = null;
                const searchInput = document.getElementById("archiveLibrarySearch");
                if (searchInput) {
                    searchInput.value = "";
                    this.searchQuery = "";
                    const clearBtn = document.getElementById("clearArchiveSearch");
                    if (clearBtn) clearBtn.style.display = "none";
                }
                this.renderFolders();
            });
        }
    }

    updateBreadcrumb(folderName) {
        const rootBtn = document.getElementById("archiveBreadcrumbRoot");
        const separator = document.getElementById("archiveBreadcrumbSeparator");
        const currentLabel = document.getElementById("archiveBreadcrumbCurrent");

        if (folderName) {
            separator.style.display = "inline";
            currentLabel.style.display = "inline";
            currentLabel.textContent = folderName;
            rootBtn.style.cursor = "pointer";
            rootBtn.style.color = "#3b82f6";
        } else {
            separator.style.display = "none";
            currentLabel.style.display = "none";
            rootBtn.style.cursor = "default";
            rootBtn.style.color = "#fff";
        }
    }

    renderFolders() {
        this.currentFolder = null;
        this.updateBreadcrumb(null);
        
        const grid = document.getElementById("archiveLibraryGrid");
        if (!grid) return;
        
        grid.innerHTML = "";
        
        const folderNames = Object.keys(this.folders).sort();
        const filtered = folderNames.filter(name => name.toLowerCase().includes(this.searchQuery));

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="padding: 20px; color: #888; grid-column: 1 / -1; text-align: center;">No folders found.</div>`;
            return;
        }

        filtered.forEach(folderName => {
            const fileCount = this.folders[folderName].length;
            const card = document.createElement("div");
            card.style.cssText = `
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: transform 0.2s, background 0.2s;
                display: flex;
                align-items: center;
                gap: 16px;
            `;
            
            card.onmouseenter = () => { card.style.background = "rgba(255,255,255,0.08)"; card.style.transform = "translateY(-2px)"; };
            card.onmouseleave = () => { card.style.background = "rgba(255,255,255,0.05)"; card.style.transform = "none"; };

            card.innerHTML = `
                <div style="width: 48px; height: 48px; border-radius: 8px; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="width:24px;height:24px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 1.05rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${folderName.replace(/"/g, '&quot;')}">${folderName}</div>
                    <div style="font-size: 0.85rem; color: #888; margin-top: 4px;">${fileCount} EPUB${fileCount !== 1 ? 's' : ''}</div>
                </div>
            `;
            
            card.addEventListener("click", () => this.renderFiles(folderName));
            grid.appendChild(card);
        });
    }

    renderFiles(folderName) {
        this.currentFolder = folderName;
        this.updateBreadcrumb(folderName);
        
        const grid = document.getElementById("archiveLibraryGrid");
        if (!grid) return;
        
        grid.innerHTML = "";
        
        const files = this.folders[folderName] || [];
        const filtered = files.filter(f => f.name.toLowerCase().includes(this.searchQuery));

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="padding: 20px; color: #888; grid-column: 1 / -1; text-align: center;">No EPUB files match your search.</div>`;
            return;
        }

        filtered.forEach(file => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const card = document.createElement("div");
            card.style.cssText = `
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: transform 0.2s, background 0.2s;
            `;
            card.onmouseenter = () => { card.style.background = "rgba(255,255,255,0.06)"; };
            card.onmouseleave = () => { card.style.background = "rgba(255,255,255,0.03)"; };

            card.innerHTML = `
                <div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; line-height: 1.4; word-break: break-word;">${file.name}</div>
                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 12px;">EPUB · ${sizeMB} MB</div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: auto;">
                    <button class="archive-read-btn" style="
                        flex: 1; padding: 8px 0; border-radius: 20px; border: none; background: #3b82f6; color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                        Read Live
                    </button>
                    <a href="${file.url}" target="_blank" download="${file.name}" style="
                        flex: 1; padding: 8px 0; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #ddd; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
                    " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                            <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3zm-7.25 13.5a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z" clip-rule="evenodd"/>
                        </svg>
                        Download
                    </a>
                </div>
            `;

            // Read Live click handler
            const readBtn = card.querySelector('.archive-read-btn');
            readBtn.addEventListener('click', async () => {
                if (readBtn.disabled) return;
                const originalHTML = readBtn.innerHTML;
                
                try {
                    readBtn.innerHTML = "Downloading...";
                    readBtn.disabled = true;

                    const loader = document.getElementById("libraryLoader");
                    if (loader) {
                        loader.innerHTML = `<div class="spinner-ring"></div><div style="color:var(--primary,#3b82f6); font-weight:700; text-align:center;">Downloading Archive EPUB...<br><span style="font-size:0.8rem;color:#aaa;">"${file.name}"</span></div>`;
                        loader.style.display = "flex";
                    }

                    const proxies = [
                        { name: "Direct", prefix: "" },
                        { name: "Tufive Workers Proxy", prefix: "https://fragrant-frost-f292.tufive.workers.dev/?url=" },
                        { name: "corsproxy.io", prefix: "https://corsproxy.io/?" },
                        { name: "CodeTabs", prefix: "https://api.codetabs.com/v1/proxy/?quest=" },
                        { name: "AllOrigins", prefix: "https://api.allorigins.win/raw?url=" }
                    ];

                    let response = null;
                    let lastError = null;

                    for (const proxy of proxies) {
                        try {
                            const targetUrl = proxy.prefix ? proxy.prefix + encodeURIComponent(file.url) : file.url;
                            
                            // Update loader to indicate which proxy is being tried
                            if (loader) {
                                loader.innerHTML = `<div class="spinner-ring"></div><div style="color:var(--primary,#3b82f6); font-weight:700; text-align:center;">Downloading Archive EPUB...<br><span style="font-size:0.8rem;color:#aaa;">"${file.name}"</span><br><span style="font-size:0.7rem;color:#888;">via ${proxy.name}</span></div>`;
                            }

                            const res = await fetch(targetUrl);
                            if (res.ok) {
                                response = res;
                                break; // Success, exit the loop
                            }
                        } catch (err) {
                            lastError = err;
                            console.warn(`Fetch via ${proxy.name} failed. Trying next...`, err);
                        }
                    }

                    if (!response || !response.ok) {
                        throw new Error("All proxy methods failed. Last error: " + (lastError ? lastError.message : "Unknown HTTP error"));
                    }
                    
                    const buffer = await response.arrayBuffer();
                    const blob = new Blob([buffer], { type: "application/epub+zip" });
                    blob.name = file.name;

                    if (loader) loader.style.display = "none";
                    readBtn.innerHTML = "Opening...";
                    readBtn.style.background = "#10b981";

                    await new Promise(r => setTimeout(r, 150));

                    if (window.libraryManager && typeof window.libraryManager.openBookInReader === "function") {
                        window.libraryManager.openBookInReader(blob);
                    } else {
                        alert("Library manager not found. Cannot open EPUB.");
                    }
                    
                    setTimeout(() => {
                        readBtn.innerHTML = originalHTML;
                        readBtn.disabled = false;
                        readBtn.style.background = "#3b82f6";
                    }, 1000);
                } catch (e) {
                    console.error("Read Live failed:", e);
                    alert("Error loading EPUB: " + e.message + "\n\nIf you see CORS errors, try using the 'Download' button instead and opening the file manually.");
                    const loader = document.getElementById("libraryLoader");
                    if (loader) loader.style.display = "none";
                    readBtn.innerHTML = "Failed";
                    readBtn.style.background = "#ef4444";
                    setTimeout(() => { 
                        readBtn.innerHTML = originalHTML; 
                        readBtn.disabled = false; 
                        readBtn.style.background = "#3b82f6";
                    }, 2000);
                }
            });

            grid.appendChild(card);
        });
    }
}

// Instantiate globally
if (typeof window !== "undefined") {
    window.archiveLibrary = new ArchiveLibrary();
}
