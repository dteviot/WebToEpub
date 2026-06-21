/* Personal and Public Library UI Controller */
"use strict";

class LibraryUI {
    constructor(epubViewer) {
        this.epubViewer = epubViewer;
        this.storage = this.initStorage();
        this.publicCatalog = null;
        this.telegramCatalog = null;
        this.activeLibraryTab = "personal";
        this.publicSearchQuery = "";
        this.publicCurrentPage = 1;
        this.publicBooksPerPage = 10;
        this.currentDetailsEpub = null;
        this.currentDetailsFilename = "";
    }

    initStorage() {
        // Dual-storage manager (extension chrome.storage.local + standard IndexedDB fallback)
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && !window.WTE_WEBSITE_MODE) {
            return {
                get: (keys) => new Promise(resolve => chrome.storage.local.get(keys, resolve)),
                set: (obj) => new Promise(resolve => chrome.storage.local.set(obj, resolve)),
                remove: (keys) => new Promise(resolve => chrome.storage.local.remove(keys, resolve)),
                getAll: () => new Promise(resolve => chrome.storage.local.get(null, resolve))
            };
        } else {
            // IndexedDB Store wrapper matching the chrome.storage.local API
            const dbName = "WebToEpubLibrary";
            const storeName = "books";

            const getDb = () => {
                if (LibraryUI.sharedDbPromise) return LibraryUI.sharedDbPromise;
                LibraryUI.sharedDbPromise = new Promise((resolve, reject) => {
                    const request = indexedDB.open(dbName, 1);
                    request.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName);
                        }
                    };
                    request.onsuccess = (e) => {
                        resolve(e.target.result);
                    };
                    request.onerror = (e) => {
                        LibraryUI.sharedDbPromise = null;
                        reject(e.target.error);
                    };
                });
                return LibraryUI.sharedDbPromise;
            };

            const store = {
                get: async (keys) => {
                    const db = await getDb();
                    return new Promise((resolve) => {
                        const transaction = db.transaction([storeName], "readonly");
                        const objectStore = transaction.objectStore(storeName);
                        const keyList = Array.isArray(keys) ? keys : [keys];
                        const result = {};
                        let count = 0;

                        if (keyList.length === 0) {
                            resolve(result);
                            return;
                        }

                        keyList.forEach(k => {
                            const req = objectStore.get(k);
                            req.onsuccess = (e) => {
                                const val = e.target.result;
                                if (val !== undefined) {
                                    result[k] = val;
                                }
                                count++;
                                if (count === keyList.length) resolve(result);
                            };
                            req.onerror = () => {
                                count++;
                                if (count === keyList.length) resolve(result);
                            };
                        });
                    });
                },
                set: async (obj) => {
                    const db = await getDb();
                    return new Promise((resolve, reject) => {
                        const transaction = db.transaction([storeName], "readwrite");
                        const objectStore = transaction.objectStore(storeName);
                        
                        Object.entries(obj).forEach(([k, v]) => {
                            objectStore.put(v, k);
                        });

                        transaction.oncomplete = () => resolve();
                        transaction.onerror = (e) => reject(e.target.error);
                    });
                },
                remove: async (keys) => {
                    const db = await getDb();
                    return new Promise((resolve, reject) => {
                        const transaction = db.transaction([storeName], "readwrite");
                        const objectStore = transaction.objectStore(storeName);
                        const keyList = Array.isArray(keys) ? keys : [keys];

                        keyList.forEach(k => {
                            objectStore.delete(k);
                        });

                        transaction.oncomplete = () => resolve();
                        transaction.onerror = (e) => reject(e.target.error);
                    });
                },
                getAll: async () => {
                    const db = await getDb();
                    return new Promise((resolve, reject) => {
                        const transaction = db.transaction([storeName], "readonly");
                        const objectStore = transaction.objectStore(storeName);
                        const result = {};
                        
                        const cursorRequest = objectStore.openCursor();
                        cursorRequest.onsuccess = (e) => {
                            const cursor = e.target.result;
                            if (cursor) {
                                result[cursor.key] = cursor.value;
                                cursor.continue();
                            } else {
                                resolve(result);
                            }
                        };
                        cursorRequest.onerror = (e) => reject(e.target.error);
                    });
                },
                migrate: async () => {
                    try {
                        const libArrayStr = localStorage.getItem("LibArray");
                        if (libArrayStr) {
                            const libArray = JSON.parse(libArrayStr);
                            if (Array.isArray(libArray)) {
                                const migrationData = { "LibArray": libArray };
                                const keysToRemove = ["LibArray"];

                                libArray.forEach(id => {
                                    const epub = localStorage.getItem(`LibEpub${id}`);
                                    const filename = localStorage.getItem(`LibFilename${id}`);
                                    const cover = localStorage.getItem(`LibCover${id}`);
                                    const storyURL = localStorage.getItem(`LibStoryURL${id}`);
                                    const title = localStorage.getItem(`LibTitle${id}`);
                                    const author = localStorage.getItem(`LibAuthor${id}`);
                                    const progress = localStorage.getItem(`LibProgress${id}`);

                                    if (epub) {
                                        try { migrationData[`LibEpub${id}`] = JSON.parse(epub); } catch { migrationData[`LibEpub${id}`] = epub; }
                                    }
                                    if (filename) {
                                        try { migrationData[`LibFilename${id}`] = JSON.parse(filename); } catch { migrationData[`LibFilename${id}`] = filename; }
                                    }
                                    if (cover) {
                                        try { migrationData[`LibCover${id}`] = JSON.parse(cover); } catch { migrationData[`LibCover${id}`] = cover; }
                                    }
                                    if (storyURL) {
                                        try { migrationData[`LibStoryURL${id}`] = JSON.parse(storyURL); } catch { migrationData[`LibStoryURL${id}`] = storyURL; }
                                    }
                                    if (title) {
                                        try { migrationData[`LibTitle${id}`] = JSON.parse(title); } catch { migrationData[`LibTitle${id}`] = title; }
                                    }
                                    if (author) {
                                        try { migrationData[`LibAuthor${id}`] = JSON.parse(author); } catch { migrationData[`LibAuthor${id}`] = author; }
                                    }
                                    if (progress) {
                                        try { migrationData[`LibProgress${id}`] = JSON.parse(progress); } catch { migrationData[`LibProgress${id}`] = progress; }
                                    }

                                    keysToRemove.push(
                                        `LibEpub${id}`, `LibFilename${id}`, `LibCover${id}`,
                                        `LibStoryURL${id}`, `LibTitle${id}`, `LibAuthor${id}`, `LibProgress${id}`
                                    );
                                });

                                await store.set(migrationData);
                                keysToRemove.forEach(k => localStorage.removeItem(k));
                                console.log("IndexedDB Migration: Successfully migrated localStorage data to IndexedDB!");
                            }
                        }
                    } catch (e) {
                        console.error("IndexedDB Migration: Failed to migrate localStorage data", e);
                    }
                }
            };
            return store;
        }
    }

    async init() {
        if (typeof zip !== "undefined" && typeof EpubViewerUI !== "undefined"
            && typeof EpubViewerUI._configureZipRuntime === "function") {
            EpubViewerUI._configureZipRuntime();
        }

        // Migrate data if falling back to IndexedDB
        if (this.storage && this.storage.migrate) {
            await this.storage.migrate();
        }

        this.bindEvents();
        await this.renderPersonalLibrary();
        this.renderPublicLibrary();
    }

    static buildInlineCover(background, accent, titleTop, titleMain, author) {
        let svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
                <rect width="200" height="300" fill="${background}"/>
                <text x="50%" y="35%" fill="#fff" font-size="16" font-weight="700" font-family="serif" text-anchor="middle">${titleTop}</text>
                <text x="50%" y="50%" fill="${accent}" font-size="20" font-weight="700" font-family="serif" text-anchor="middle">${titleMain}</text>
                <text x="50%" y="70%" fill="#aaa" font-size="12" font-family="sans-serif" text-anchor="middle">${author}</text>
            </svg>
        `.trim();
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    bindEvents() {
        // Drop-upload or select file to import
        const uploader = document.getElementById("libraryImportInput");
        if (uploader) {
            uploader.addEventListener("change", (e) => this.handleLocalImport(e));
        }

        const tabPersonal = document.getElementById("tabLibraryPersonal");
        const tabPublic = document.getElementById("tabLibraryPublic");
        const tabTelegram = document.getElementById("tabLibraryTelegram");
        const tabMega = document.getElementById("tabLibraryMega");
        const tabArchive = document.getElementById("tabLibraryArchive");
        const tabAnna = document.getElementById("tabLibraryAnna");
        const tabAudioBook = document.getElementById("tabLibraryAudioBook");
        const uploadSection = document.querySelector(".library-upload-section");
        const publicSearch = document.getElementById("publicLibrarySearch");
        const clearPublicSearch = document.getElementById("clearPublicSearch");
        
        if (publicSearch) {
            publicSearch.addEventListener("input", (e) => {
                this.publicSearchQuery = e.target.value.toLowerCase().trim();
                this.publicCurrentPage = 1;
                if (clearPublicSearch) {
                    clearPublicSearch.style.display = this.publicSearchQuery.length > 0 ? "flex" : "none";
                }
                this.renderPublicGrid();
            });
        }
        
        if (clearPublicSearch) {
            clearPublicSearch.addEventListener("click", () => {
                if (publicSearch) publicSearch.value = "";
                this.publicSearchQuery = "";
                this.publicCurrentPage = 1;
                clearPublicSearch.style.display = "none";
                this.renderPublicGrid();
            });
        }

        const setActiveTab = (tabId) => {
            this.activeLibraryTab = tabId;
            [tabPersonal, tabPublic, tabTelegram, tabMega, tabArchive, tabAnna, tabAudioBook].forEach(tab => {
                if (tab) tab.classList.remove("active");
            });
            if (tabId === "personal" && tabPersonal) tabPersonal.classList.add("active");
            if (tabId === "public" && tabPublic) tabPublic.classList.add("active");
            if (tabId === "telegram" && tabTelegram) tabTelegram.classList.add("active");
            if (tabId === "mega" && tabMega) tabMega.classList.add("active");
            if (tabId === "archive" && tabArchive) tabArchive.classList.add("active");
            if (tabId === "anna" && tabAnna) tabAnna.classList.add("active");
            if (tabId === "audiobook" && tabAudioBook) tabAudioBook.classList.add("active");

            // Hide all views first
            const views = ["personalLibraryGrid", "publicLibraryView", "megaLibraryView", "archiveLibraryView", "annaLibraryView", "audioBookView"];
            views.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = "none";
            });

            if (tabId === "personal") {
                document.getElementById("personalLibraryGrid").style.display = "grid";
                if (uploadSection) uploadSection.style.display = "block";
            } else if (tabId === "mega") {
                const megaView = document.getElementById("megaLibraryView");
                if (megaView) megaView.style.display = "block";
                if (uploadSection) uploadSection.style.display = "none";
                
                if (window.megaLibrary && !window.megaLibrary.currentFolder) {
                    window.megaLibrary.loadFolder("https://mega.nz/folder/Ci4ETASB#KIFVuPI99P1Ytg0dxmtYlw");
                }
            } else if (tabId === "archive") {
                const archiveView = document.getElementById("archiveLibraryView");
                if (archiveView) archiveView.style.display = "block";
                if (uploadSection) uploadSection.style.display = "none";

                if (window.archiveLibrary && !window.archiveLibrary.isLoaded) {
                    window.archiveLibrary.loadRoot();
                }
            } else if (tabId === "anna") {
                const annaView = document.getElementById("annaLibraryView");
                if (annaView) annaView.style.display = "block";
                if (uploadSection) uploadSection.style.display = "none";
                this._initAnnaSearch();
            } else if (tabId === "audiobook") {
                const audioView = document.getElementById("audioBookView");
                if (audioView) audioView.style.display = "block";
                if (uploadSection) uploadSection.style.display = "none";
                this._initAudioBookSearch();
            } else {
                document.getElementById("publicLibraryView").style.display = "block";
                if (uploadSection) uploadSection.style.display = "block";
                
                if (publicSearch) publicSearch.value = "";
                this.publicSearchQuery = "";
                this.publicCurrentPage = 1;
                if (clearPublicSearch) clearPublicSearch.style.display = "none";
                
                this.renderPublicLibrary();
            }
        };

        if (tabPersonal) tabPersonal.addEventListener("click", () => setActiveTab("personal"));
        if (tabPublic) tabPublic.addEventListener("click", () => setActiveTab("public"));
        if (tabTelegram) tabTelegram.addEventListener("click", () => setActiveTab("telegram"));
        if (tabMega) tabMega.addEventListener("click", () => setActiveTab("mega"));
        if (tabArchive) tabArchive.addEventListener("click", () => setActiveTab("archive"));
        if (tabAnna) tabAnna.addEventListener("click", () => setActiveTab("anna"));
        if (tabAudioBook) tabAudioBook.addEventListener("click", () => setActiveTab("audiobook"));

        // Book details page interactive controls
        const detailsBackBtn = document.getElementById("detailsBackBtn");
        if (detailsBackBtn) {
            detailsBackBtn.addEventListener("click", () => {
                if (typeof window.showView === "function") {
                    window.showView("librariesView");
                } else {
                    const lv = document.getElementById("librariesView");
                    if (lv) { lv.style.display = "block"; lv.classList.add("active"); }
                    document.querySelectorAll(".app-view").forEach(v => { if (v.id !== "librariesView") { v.classList.remove("active"); v.style.display = "none"; } });
                    const globalBackBtn = document.getElementById("globalBackBtn");
                    if (globalBackBtn) globalBackBtn.style.display = "flex";
                }
            });
        }

        const detailsStartReadingBtn = document.getElementById("detailsStartReadingBtn");
        if (detailsStartReadingBtn) {
            detailsStartReadingBtn.addEventListener("click", async () => {
                if (this.currentDetailsAudiobookLink) {
                    if (this.currentDetailsMagnet) {
                        window.open(`https://webtor.io/${encodeURIComponent(this.currentDetailsMagnet)}`, "_blank");
                    } else {
                        window.open(this.currentDetailsAudiobookLink, "_blank");
                    }
                    return;
                }

                if (this.currentDetailsEpub) {
                    if (typeof this.currentDetailsEpub === "string" && this.currentDetailsEpub.startsWith("lazy:liveread")) {
                        let url = this.currentDetailsEpub.replace("lazy:liveread:", "").replace("lazy:liveread", "");
                        if (!url && this.currentDetailsId) {
                            url = this.currentDetailsId; // fallback for legacy saved live books
                        }
                        const isInsidePlugin = window.location.pathname.includes("/plugin/") || window.location.protocol === "chrome-extension:";
                        const lrPath = isInsidePlugin ? "live-reader.html" : "plugin/live-reader.html";
                        window.location.href = `${lrPath}?url=${encodeURIComponent(url)}`;
                    } else {
                        this.openBookInReader(this.currentDetailsEpub);
                    }
                }
            });
        }

        const detailsStreamBtn = document.getElementById("detailsStreamBtn");
        if (detailsStreamBtn) {
            detailsStreamBtn.addEventListener("click", () => {
                if (this.currentDetailsMagnet) {
                    window.open(`https://webtor.io/${encodeURIComponent(this.currentDetailsMagnet)}`, "_blank");
                } else if (this.currentDetailsAudiobookLink) {
                    window.open(this.currentDetailsAudiobookLink, "_blank");
                }
            });
        }

        const detailsSeedrBtn = document.getElementById("detailsSeedrBtn");
        if (detailsSeedrBtn) {
            detailsSeedrBtn.addEventListener("click", () => {
                window.open("https://www.seedr.cc/", "_blank");
            });
        }

        const detailsCopyMagnetBtn = document.getElementById("detailsCopyMagnetBtn");
        if (detailsCopyMagnetBtn) {
            detailsCopyMagnetBtn.addEventListener("click", async () => {
                if (this.currentDetailsMagnet) {
                    try {
                        if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(this.currentDetailsMagnet);
                        } else {
                            const textArea = document.createElement("textarea");
                            textArea.value = this.currentDetailsMagnet;
                            textArea.style.position = "fixed";
                            textArea.style.left = "-999999px";
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                        }
                        
                        const originalText = detailsCopyMagnetBtn.innerHTML;
                        detailsCopyMagnetBtn.innerHTML = "✓ Copied";
                        setTimeout(() => { detailsCopyMagnetBtn.innerHTML = originalText; }, 2000);
                    } catch (err) {
                        alert("Failed to copy magnet link. See console for details.");
                        console.error("Copy failed", err);
                    }
                } else {
                    alert("No magnet link available to copy.");
                }
            });
        }

        const detailsDownloadBtn = document.getElementById("detailsDownloadBtn");
        if (detailsDownloadBtn) {
            detailsDownloadBtn.addEventListener("click", () => {
                if (this.currentDetailsEpub) {
                    if (typeof this.currentDetailsEpub === "string") {
                        this.downloadBlob(this.currentDetailsEpub, this.currentDetailsFilename);
                    } else {
                        const url = URL.createObjectURL(this.currentDetailsEpub);
                        this.downloadBlob(url, this.currentDetailsFilename);
                        URL.revokeObjectURL(url);
                    }
                }
            });
        }
    }

    async handleLocalImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const loader = document.getElementById("libraryLoader");
        if (loader) loader.style.display = "flex";

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result;
                    
                    // Get EPUB Title / Cover using temporary zip reader
                    await this.epubViewer.ensureZipAvailable();
                    const zipSource = new zip.BlobReader(file);
                    const zipReader = new zip.ZipReader(zipSource, { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) });
                    const entries = await zipReader.getEntries();
                    
                    const opfEntry = entries.find(entry => entry.filename.endsWith(".opf"));
                    let title = file.name.replace(/\.epub$/i, "");
                    let author = "Unknown Author";
                    let coverDataUrl = "";
                    let description = "";

                    if (opfEntry) {
                        const opfText = await opfEntry.getData(new zip.TextWriter());
                        let opfDoc = new DOMParser().parseFromString(opfText, "application/xml");
                        if (opfDoc.querySelector("parsererror")) {
                            opfDoc = new DOMParser().parseFromString(opfText, "text/html");
                        }
                        
                        const titleEl = opfDoc.querySelector("title, [localName='title']");
                        const creatorEl = opfDoc.querySelector("creator, [localName='creator']");
                        if (titleEl) title = titleEl.textContent;
                        if (creatorEl) author = creatorEl.textContent;

                        // Locate Cover
                        const opfDir = opfEntry.filename.substring(0, opfEntry.filename.lastIndexOf("/") + 1);
                        const coverItem = opfDoc.querySelector("item[properties~='cover-image'], item[id='cover'], item[id='cover-image']");
                        let coverPath = "";
                        if (coverItem) {
                            coverPath = this.resolvePath(opfDir, coverItem.getAttribute("href"));
                        } else {
                            const coverEntry = entries.find(ent => ent.filename.match(/cover\.(jpg|jpeg|png|svg)/i));
                            if (coverEntry) coverPath = coverEntry.filename;
                        }

                        if (coverPath) {
                            const coverEntry = entries.find(ent => ent.filename === coverPath);
                            if (coverEntry) {
                                const ext = coverPath.split(".").pop().toLowerCase();
                                coverDataUrl = await coverEntry.getData(new zip.Data64URIWriter(`image/${ext === "svg" ? "svg+xml" : ext}`));
                            }
                        }

                        // Extract a snippet for description (first ~200 characters of the first readable chapter)
                        const spine = opfDoc.querySelector("spine");
                        const manifest = opfDoc.querySelector("manifest");
                        if (spine && manifest) {
                            const itemrefs = spine.querySelectorAll("itemref");
                            for (let i = 0; i < itemrefs.length; i++) {
                                const idref = itemrefs[i].getAttribute("idref");
                                const item = manifest.querySelector(`item[id="${idref}"]`);
                                if (!item) continue;
                                
                                const href = item.getAttribute("href");
                                const fullPath = this.resolvePath(opfDir, href);
                                const entry = entries.find(e => e.filename === fullPath);
                                if (!entry) continue;

                                const content = await entry.getData(new zip.TextWriter());
                                const doc = new DOMParser().parseFromString(content, "text/html");
                                const text = doc.body ? doc.body.textContent.replace(/\s+/g, " ").trim() : "";
                                
                                if (text.length > 50) {
                                    description = text.substring(0, 200) + "...";
                                    break;
                                }
                            }
                        }
                    }

                    // Generate incremental story ID
                    const storageData = await this.storage.get("LibArray");
                    let libArray = storageData.LibArray || [];
                    if (!Array.isArray(libArray)) libArray = [];
                    
                    const newId = Date.now().toString();
                    libArray.push(newId);

                    // Commit to storage database
                    await this.storage.set({
                        "LibArray": libArray,
                        [`LibEpub${newId}`]: base64Data,
                        [`LibFilename${newId}`]: file.name,
                        [`LibCover${newId}`]: coverDataUrl || "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMTExZjsiPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMTExZiIvPgo8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==",
                        [`LibStoryURL${newId}`]: "local-upload",
                        [`LibTitle${newId}`]: title,
                        [`LibAuthor${newId}`]: author,
                        [`LibDesc${newId}`]: description,
                        [`LibProgress${newId}`]: 0
                    });

                    await this.renderPersonalLibrary();
                    if (loader) loader.style.display = "none";
                } catch (innerErr) {
                    console.error("Inner import failed:", innerErr);
                    if (loader) loader.style.display = "none";
                    alert("Error importing EPUB: " + innerErr.message);
                }
            };
            reader.readAsDataURL(file);
        } catch (e) {
            if (loader) loader.style.display = "none";
            alert("Error importing file: " + e.message);
        }
    }

    async renderPersonalLibrary() {
        const grid = document.getElementById("personalLibraryGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const storageData = await this.storage.get("LibArray");
        const libArray = storageData.LibArray || [];

        if (libArray.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <svg style="width: 64px; height: 64px; stroke: currentColor; fill: none; margin-bottom: 16px;" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p style="font-size: 1.2rem; font-weight: 600; margin: 0 0 8px;">Your personal library is empty</p>
                    <p style="font-size: 0.95rem; margin: 0;">Drag and drop or select an EPUB file above to import it!</p>
                </div>
            `;
            return;
        }

        // Batch load book information from storage keys
        const keys = [];
        libArray.forEach(id => {
            keys.push(`LibTitle${id}`, `LibAuthor${id}`, `LibCover${id}`, `LibProgress${id}`, `LibEpub${id}`, `LibFilename${id}`, `LibDesc${id}`);
        });

        const booksData = await this.storage.get(keys);

        libArray.forEach(id => {
            const title = booksData[`LibTitle${id}`] || "Unknown Novel";
            const author = booksData[`LibAuthor${id}`] || "Unknown Author";
            let cover = booksData[`LibCover${id}`] || "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMTExZjsiPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMTExZiIvPgo8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";
            if (cover && cover.includes("default_cover.jpg")) {
                cover = this.defaultPublicCover();
            }
            const progress = parseFloat(booksData[`LibProgress${id}`] || 0);
            const epubBase64 = booksData[`LibEpub${id}`];
            const filename = booksData[`LibFilename${id}`] || `${title}.epub`;
            const description = booksData[`LibDesc${id}`] || "";

            const card = document.createElement("div");
            card.className = "library-book-card";
            card.innerHTML = `
                <div class="book-cover-wrap">
                    <img class="book-cover-img" src="${cover}" alt="Book Cover">
                    <div class="book-overlay-actions">
                        <button class="book-action-btn read-btn-main">Read Now</button>
                        <button class="book-action-btn download-btn-main">Save File</button>
                        ${(epubBase64 && epubBase64.startsWith("lazy:")) ? "" : "<button class=\"book-action-btn share-public-btn\" style=\"background: var(--primary, #0078d4) !important; color: #000 !important; font-weight: 800 !important;\">Share Public</button>"}
                    </div>
                </div>
                <div class="book-details">
                    <div class="book-title" title="${title}">${title}</div>
                    <div class="book-author">${author}</div>
                    <div class="book-progress-track">
                        <div class="book-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted); margin-top: 4px;">
                        <span>Progress: ${progress.toFixed(0)}%</span>
                        <button class="book-delete-btn" title="Delete from Library">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                                <path fill-rule="evenodd" d="M8.75 3A2.75 2.75 0 006 5.75v.25H4.25a.75.75 0 000 1.5h11.5a.75.75 0 000-1.5H14v-.25A2.75 2.75 0 0011.25 3h-2.5zM6 7.5h8v7.25a2.75 2.75 0 01-2.75 2.75h-2.5A2.75 2.75 0 016 14.75V7.5z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Action triggers (Cover click and Read button redirect to details page, or Live Reader for live books)
            const handleBookClick = () => {
                if (epubBase64 && typeof epubBase64 === "string" && epubBase64.startsWith("lazy:liveread")) {
                    let url = epubBase64.replace("lazy:liveread:", "").replace("lazy:liveread", "");
                    if (!url) url = id;
                    const isInsidePlugin = window.location.pathname.includes("/plugin/") || window.location.protocol === "chrome-extension:";
                    const lrPath = isInsidePlugin ? "live-reader.html" : "plugin/live-reader.html";
                    window.location.href = `${lrPath}?url=${encodeURIComponent(url)}`;
                } else {
                    this.showBookDetailsPage({
                        id: id,
                        title: title,
                        author: author,
                        cover: cover,
                        epubBase64: epubBase64,
                        filename: filename
                    }, true);
                }
            };

            card.querySelector(".read-btn-main").addEventListener("click", handleBookClick);

            card.querySelector(".book-cover-wrap").addEventListener("click", (e) => {
                if (e.target.classList.contains("book-action-btn")) return;
                handleBookClick();
            });

            card.querySelector(".download-btn-main").addEventListener("click", () => {
                this.downloadBlob(epubBase64, filename);
            });

            const sharePublicBtn = card.querySelector(".share-public-btn");
            if (sharePublicBtn) {
                sharePublicBtn.addEventListener("click", async () => {
                    const loader = document.getElementById("libraryLoader");
                    if (loader) {
                        loader.style.display = "flex";
                        const statusText = loader.querySelector("div:last-child");
                        if (statusText) statusText.textContent = "Uploading to Hugging Face Open Database...";
                    }

                    try {
                        const token = HFLibrary.ensureTokenConfigured(true);
                        if (!token) {
                            throw new Error("Hugging Face token is required to share books publicly.");
                        }

                        // Convert epubBase64 data URL to a Blob
                        const epubBlob = await HFLibrary._dataUrlToBlobAsync(epubBase64);
                    
                        // Upload to HF Public Library
                        await HFLibrary.uploadBook(epubBlob, {
                            title: title,
                            author: author,
                            coverDataUrl: cover,
                            description: description
                        });

                        alert(`Successfully shared "${title}" to the Hugging Face Public Library!`);
                    
                        // Trigger a re-render of Public Library to show the new addition
                        this.renderPublicLibrary();
                    } catch (e) {
                        alert("Error sharing to public library: " + e.message);
                    } finally {
                        if (loader) loader.style.display = "none";
                    }
                });
            }

            card.querySelector(".book-delete-btn").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${title}" from your library?`)) {
                    let updatedArray = libArray.filter(item => item !== id);
                    await this.storage.set({ "LibArray": updatedArray });
                    await this.storage.remove([
                        `LibEpub${id}`, `LibFilename${id}`, `LibCover${id}`, 
                        `LibStoryURL${id}`, `LibTitle${id}`, `LibAuthor${id}`, `LibProgress${id}`
                    ]);
                    this.renderPersonalLibrary();
                }
            });

            grid.appendChild(card);
        });
    }

    async renderPublicLibrary() {
        const grid = document.getElementById("publicLibraryGrid");
        if (!grid) return;
        
        const isTelegram = this.activeLibraryTab === "telegram";
        const catalogTarget = isTelegram ? "telegramCatalog" : "publicCatalog";

        if (!this[catalogTarget]) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <div class="spinner-ring" style="margin: 0 auto 16px; border: 4px solid rgba(0, 120, 212, 0.1); border-top: 4px solid var(--primary, #0078d4); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="font-size: 1.1rem; font-weight: 600; margin: 0;">Connecting to ${isTelegram ? "Telegram Legacy" : "Hugging Face Open"} Database...</p>
                    <style>
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </div>
            `;
            try {
                const catalog = isTelegram ? await HFLibrary.getTelegramCatalog() : await HFLibrary.getCatalog();
                this[catalogTarget] = catalog.map(book => ({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    coverPath: book.coverPath,
                    sourceUrl: book.sourceUrl || "",
                    desc: book.description ? `${book.description} (Size: ${HFLibrary.formatSize(book.size)})` : `Size: ${HFLibrary.formatSize(book.size)} | Shared: ${new Date(book.uploadedAt).toLocaleDateString()}`,
                    isHF: true,
                    isTelegram: isTelegram,
                    epubPath: book.epubPath,
                    repoId: book.repoId
                }));
                
                if (!isTelegram) {
                    this[catalogTarget].push(
                        {
                            id: "static_1",
                            title: "The Time Machine",
                            author: "H. G. Wells",
                            coverPath: null,
                            staticCover: LibraryUI.buildInlineCover("#1a111f", "#00f5ff", "THE TIME", "MACHINE", "H. G. WELLS"),
                            desc: "The classic science fiction novella detailing an inventor's journey to the far future of humanity.",
                            isHF: false,
                            isTelegram: false,
                            generator: () => this.generateTimeMachineEPUB()
                        },
                        {
                            id: "static_2",
                            title: "Alice in Wonderland",
                            author: "Lewis Carroll",
                            coverPath: null,
                            staticCover: LibraryUI.buildInlineCover("#0a2c40", "#38ef7d", "ALICE IN", "WONDERLAND", "LEWIS CARROLL"),
                            desc: "Follow Alice down the rabbit hole into a whimsical, nonsense fantasy world of colorful creatures.",
                            isHF: false,
                            isTelegram: false,
                            generator: () => this.generateAliceEPUB()
                        }
                    );
                }
            } catch (e) {
                console.error(`HFLibrary: Failed to fetch ${isTelegram ? "telegram" : "public"} catalog.`, e);
                this[catalogTarget] = [];
            }
        }
        
        this.renderPublicGrid();
    }

    renderPublicGrid() {
        const grid = document.getElementById("publicLibraryGrid");
        const paginationContainer = document.getElementById("publicLibraryPagination");
        if (!grid) return;

        let filtered = (this.activeLibraryTab === "telegram" ? this.telegramCatalog : this.publicCatalog) || [];
        if (this.publicSearchQuery) {
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(this.publicSearchQuery) || 
                b.author.toLowerCase().includes(this.publicSearchQuery)
            );
        }

        const totalPages = Math.ceil(filtered.length / this.publicBooksPerPage) || 1;
        if (this.publicCurrentPage > totalPages) this.publicCurrentPage = totalPages;
        if (this.publicCurrentPage < 1) this.publicCurrentPage = 1;

        const startIndex = (this.publicCurrentPage - 1) * this.publicBooksPerPage;
        const pageBooks = filtered.slice(startIndex, startIndex + this.publicBooksPerPage);

        grid.innerHTML = "";

        if (pageBooks.length === 0) {
            grid.innerHTML = "<div style=\"grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);\">No books found.</div>";
        }

        pageBooks.forEach(book => {
            const card = document.createElement("div");
            card.className = "library-book-card";
            
            const coverSrc = book.staticCover ? book.staticCover : this.defaultPublicCover();

            card.innerHTML = `
                <div class="book-cover-wrap">
                    <img class="book-cover-img" id="public-cover-${book.id}" src="${coverSrc}" alt="Book Cover">
                    <div class="book-overlay-actions">
                        <button class="book-action-btn read-btn-main">Read Now</button>
                        ${book.isHF ? "<button class=\"book-action-btn download-btn-main\">Save File</button>" : ""}
                    </div>
                </div>
                <div class="book-details">
                    <div class="book-title" title="${book.title.replace(/"/g, "&quot;")}">${book.title}</div>
                    <div class="book-author">${book.author}</div>
                    <p class="book-desc-text" style="font-size:0.8rem; color:var(--text-muted); line-height: 1.4; margin: 8px 0 0; overflow:hidden; display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${book.desc}</p>
                    ${(book.isHF && !book.isTelegram) ? `
                    <div style="display:flex; justify-content:flex-end; align-items:center; margin-top: 8px;">
                        <button class="book-delete-btn" title="Delete from Public Database" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                                <path fill-rule="evenodd" d="M8.75 3A2.75 2.75 0 006 5.75v.25H4.25a.75.75 0 000 1.5h11.5a.75.75 0 000-1.5H14v-.25A2.75 2.75 0 0011.25 3h-2.5zM6 7.5h8v7.25a2.75 2.75 0 01-2.75 2.75h-2.5A2.75 2.75 0 016 14.75V7.5z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    ` : ""}
                </div>
            `;

            // Async load HF cover
            if (book.isHF && book.coverPath) {
                HFLibrary.getCoverUrl(book.coverPath, book.repoId).then(url => {
                    if (url) {
                        const img = card.querySelector(`#public-cover-${book.id}`);
                        if (img) img.src = url;
                    }
                }).catch(e => console.error("Cover load failed", e));
            }

            // Simply display fallback description if missing.
            if (book.isHF && !book.description) {
                const descEl = card.querySelector(".book-desc-text");
                if (descEl) {
                    descEl.textContent = `Size: ${HFLibrary.formatSize(book.size)} | Shared: ${new Date(book.uploadedAt).toLocaleDateString()}`;
                }
            }

            card.querySelector(".read-btn-main").addEventListener("click", () => {
                this.showBookDetailsPage(book, false);
            });

            card.querySelector(".book-cover-wrap").addEventListener("click", (e) => {
                if (e.target.classList.contains("book-action-btn")) return;
                this.showBookDetailsPage(book, false);
            });

            if (book.isHF) {
                card.querySelector(".download-btn-main").addEventListener("click", async () => {
                    const loader = document.getElementById("libraryLoader");
                    if (loader) {
                        loader.style.display = "flex";
                        const statusText = loader.querySelector("div:last-child");
                        if (statusText) statusText.textContent = "Downloading book file from Hugging Face...";
                    }
                    try {
                        const blob = await HFLibrary.downloadBook(book.epubPath, book.repoId);
                        const url = URL.createObjectURL(blob);
                        this.downloadBlob(url, `${book.title}.epub`);
                        URL.revokeObjectURL(url);
                        if (typeof HFStatsLibrary !== "undefined") {
                            HFStatsLibrary.recordEvent({
                                url: book.sourceUrl || `hf-library://${book.id}`,
                                mode: "library",
                                action: "download",
                                title: book.title,
                                author: book.author
                            });
                        }
                    } catch (e) {
                        alert("Error downloading public book: " + e.message);
                    } finally {
                        if (loader) loader.style.display = "none";
                    }
                });

                if (!book.isTelegram) {
                    card.querySelector(".book-delete-btn").addEventListener("click", async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${book.title}" from the Hugging Face Public Library?`)) {
                            const loader = document.getElementById("libraryLoader");
                            if (loader) {
                                loader.style.display = "flex";
                                const statusText = loader.querySelector("div:last-child");
                                if (statusText) statusText.textContent = "Deleting file from Hugging Face...";
                            }
                            try {
                                await HFLibrary.deleteBook(book.id);
                                alert(`Successfully deleted "${book.title}" from the public library!`);
                                this.publicCatalog = null; // force reload next time
                                this.renderPublicLibrary();
                            } catch (error) {
                                alert("Error deleting public book: " + error.message);
                            } finally {
                                if (loader) loader.style.display = "none";
                            }
                        }
                    });
                }
            }

            grid.appendChild(card);
        });

        if (paginationContainer) {
            paginationContainer.innerHTML = "";
            if (totalPages > 1) {
                const prevBtn = document.createElement("button");
                prevBtn.textContent = "Previous";
                prevBtn.style.cssText = `padding: 8px 16px; border-radius: 20px; border: none; cursor: ${this.publicCurrentPage > 1 ? "pointer" : "not-allowed"}; background: ${this.publicCurrentPage > 1 ? "var(--primary)" : "var(--reader-border)"}; color: #fff;`;
                if (this.publicCurrentPage > 1) {
                    prevBtn.onclick = () => {
                        this.publicCurrentPage--;
                        this.renderPublicGrid();
                    };
                }
                
                const info = document.createElement("span");
                info.textContent = `Page ${this.publicCurrentPage} of ${totalPages}`;
                info.style.color = "var(--reader-text)";

                const nextBtn = document.createElement("button");
                nextBtn.textContent = "Next";
                nextBtn.style.cssText = `padding: 8px 16px; border-radius: 20px; border: none; cursor: ${this.publicCurrentPage < totalPages ? "pointer" : "not-allowed"}; background: ${this.publicCurrentPage < totalPages ? "var(--primary)" : "var(--reader-border)"}; color: #fff;`;
                if (this.publicCurrentPage < totalPages) {
                    nextBtn.onclick = () => {
                        this.publicCurrentPage++;
                        this.renderPublicGrid();
                    };
                }

                paginationContainer.appendChild(prevBtn);
                paginationContainer.appendChild(info);
                paginationContainer.appendChild(nextBtn);
            }
        }
    }

    defaultPublicCover() {
        return "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgc3R5bGU9ImJhY2tncm91bmQ6IzFhMTExZjsiPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMTExZiIvPgo8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBDb3ZlciBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";
    }

    openBookInReader(epubData) {
        // Pre-show the reader loader BEFORE switching views so the user
        // always sees a spinner — never a black flash.
        const readerLoader = document.getElementById("epubReaderLoader");
        const readerLoaderText = document.getElementById("epubLoaderText");
        if (readerLoader) {
            if (readerLoaderText) readerLoaderText.textContent = "Loading EPUB…";
            readerLoader.style.display = "flex";
        }

        // Use window.showView if available (sets display:block AND active class correctly)
        if (typeof window.showView === "function") {
            // showView is async but we don't await — it will set up the view,
            // then we load the epub after two rAF frames so the view is painted.
            window.showView("epubReaderView").then(() => {
                this.epubViewer.loadEpub(epubData);
            });
        } else {
            // Fallback for extension context where showView isn't exposed
            const epubReaderView = document.getElementById("epubReaderView");
            if (epubReaderView) {
                epubReaderView.style.display = "block";
            }
            document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
            if (epubReaderView) epubReaderView.classList.add("active");
            const globalBackBtn = document.getElementById("globalBackBtn");
            if (globalBackBtn) globalBackBtn.style.display = "none";
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.epubViewer.loadEpub(epubData);
            }));
        }

        if (typeof HFStatsLibrary !== "undefined" && this.currentDetailsId != null) {
            this.storage.get([
                `LibStoryURL${this.currentDetailsId}`,
                `LibTitle${this.currentDetailsId}`,
                `LibAuthor${this.currentDetailsId}`
            ]).then(stored => {
                HFStatsLibrary.recordEvent({
                    url: stored[`LibStoryURL${this.currentDetailsId}`] || `library://personal/${this.currentDetailsId}`,
                    mode: "library",
                    action: "read",
                    title: stored[`LibTitle${this.currentDetailsId}`] || this.currentDetailsFilename,
                    author: stored[`LibAuthor${this.currentDetailsId}`] || ""
                });
            }).catch(() => {});
        }
    }

    downloadBlob(base64Data, filename) {
        const link = document.createElement("a");
        link.href = base64Data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async parseEpubMetadata(epubBlobOrBase64, fallbackTitle, fallbackAuthor, fallbackCover) {
        await this.epubViewer.ensureZipAvailable();
        let zipReaderSource;
        if (typeof epubBlobOrBase64 === "string") {
            let base64 = epubBlobOrBase64;
            if (base64.startsWith("data:")) {
                base64 = base64.split(",")[1];
            }
            const binary = atob(base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: "application/epub+zip" });
            zipReaderSource = new zip.BlobReader(blob);
        } else {
            zipReaderSource = new zip.BlobReader(epubBlobOrBase64);
        }

        const zipReader = new zip.ZipReader(zipReaderSource, { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) });
        let entries = [];
        try {
            entries = await zipReader.getEntries();
        } catch (e) {
            console.error("Error reading zip entries:", e);
        }
        
        const opfEntry = entries.find(e => e.filename.endsWith(".opf"));
        let title = fallbackTitle || "Unknown Book";
        let author = fallbackAuthor || "Unknown Author";
        let description = "No description available.";
        let seriesName = "";
        let seriesIndex = "";
        let coverDataUrl = fallbackCover || "";

        if (opfEntry) {
            try {
                const opfText = await opfEntry.getData(new zip.TextWriter());
                const parser = new DOMParser();
                let opfDoc = parser.parseFromString(opfText, "application/xml");
                if (opfDoc.querySelector("parsererror")) {
                    opfDoc = parser.parseFromString(opfText, "text/html");
                }

                const titleEl = opfDoc.querySelector("title, [localName='title']");
                const creatorEl = opfDoc.querySelector("creator, [localName='creator']");
                const descEl = opfDoc.querySelector("description, [localName='description']");
                
                if (titleEl) title = titleEl.textContent.trim();
                if (creatorEl) author = creatorEl.textContent.trim();
                if (descEl) description = descEl.textContent.trim();

                // Series info
                const calibreSeries = opfDoc.querySelector("meta[name='calibre:series']");
                const calibreSeriesIndex = opfDoc.querySelector("meta[name='calibre:series_index']");
                if (calibreSeries) {
                    seriesName = calibreSeries.getAttribute("content");
                }
                if (calibreSeriesIndex) {
                    seriesIndex = calibreSeries.getAttribute("content");
                }

                if (!seriesName) {
                    const ep3Collection = opfDoc.querySelector("meta[property='belongs-to-collection']");
                    if (ep3Collection) {
                        seriesName = ep3Collection.textContent.trim();
                        const collId = ep3Collection.getAttribute("id");
                        if (collId) {
                            const ep3GroupPos = opfDoc.querySelector(`meta[refines='#${collId}'][property='group-position']`);
                            if (ep3GroupPos) {
                                seriesIndex = ep3GroupPos.textContent.trim();
                            }
                        }
                    }
                }

                // If coverDataUrl is not present or is the default, scan the zip file
                if (!coverDataUrl || coverDataUrl.startsWith("data:image/svg+xml;base64,PD94bW")) {
                    const opfDir = opfEntry.filename.substring(0, opfEntry.filename.lastIndexOf("/") + 1);
                    let coverImgPath = "";
                    const coverItem = opfDoc.querySelector("item[properties~='cover-image'], item[id='cover'], item[id='cover-image']");
                    if (coverItem) {
                        coverImgPath = this.resolvePath(opfDir, coverItem.getAttribute("href"));
                    } else {
                        const coverEntry = entries.find(e => e.filename.match(/cover\.(jpg|jpeg|png|svg)/i));
                        if (coverEntry) coverImgPath = coverEntry.filename;
                    }

                    if (coverImgPath) {
                        const coverEntry = entries.find(e => e.filename === coverImgPath);
                        if (coverEntry) {
                            const fileExt = coverImgPath.split(".").pop().toLowerCase();
                            const mime = `image/${fileExt === "svg" ? "svg+xml" : fileExt}`;
                            coverDataUrl = await coverEntry.getData(new zip.Data64URIWriter(mime));
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to parse content.opf metadata", err);
            }
        }

        try {
            await zipReader.close();
        } catch (e) {
            console.error("Error closing zip reader:", e);
        }

        return {
            title,
            author,
            description,
            seriesName,
            seriesIndex,
            coverDataUrl
        };
    }

    stripHtmlTags(html) {
        if (!html) return "";
        
        // Unescape standard HTML entities so DOMParser can process them as nodes
        let text = html
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, "\"")
            .replace(/&#39;/g, "'");
            
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            
            // Insert newlines for common block elements to preserve paragraph formatting
            doc.querySelectorAll("p, div, li, br, h1, h2, h3, h4, h5, h6").forEach(el => {
                if (el.tagName.toLowerCase() === "br") {
                    el.after("\n");
                } else {
                    el.after("\n\n");
                }
            });
            
            let clean = doc.body.textContent || doc.body.innerText || text;
            return clean
                .replace(/[ \t]+/g, " ")      // Collapse horizontal whitespace
                .replace(/\n\s*\n\s*\n+/g, "\n\n") // Collapse 3+ newlines to 2
                .trim();
        } catch (e) {
            // Regex fallback if DOMParser fails
            return text.replace(/<[^>]*>/g, "").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
        }
    }

    async ensureCatalogsLoaded() {
        const prevTab = this.activeLibraryTab;
        if (!this.publicCatalog) {
            this.activeLibraryTab = "public";
            await this.renderPublicLibrary();
        }
        if (!this.telegramCatalog) {
            this.activeLibraryTab = "telegram";
            await this.renderPublicLibrary();
        }
        this.activeLibraryTab = prevTab;
    }

    _findPublicBookById(id) {
        const all = [...(this.publicCatalog || []), ...(this.telegramCatalog || [])];
        return all.find(b => String(b.id) === String(id)) || null;
    }

    async _findPersonalBookById(id) {
        const storageData = await this.storage.get(["LibArray", `LibTitle${id}`, `LibAuthor${id}`, `LibCover${id}`, `LibEpub${id}`, `LibFilename${id}`, `LibDesc${id}`]);
        const libArray = storageData.LibArray || [];
        if (!libArray.includes(id)) {
            return null;
        }
        return {
            id: id,
            title: storageData[`LibTitle${id}`] || "Unknown Novel",
            author: storageData[`LibAuthor${id}`] || "Unknown Author",
            cover: storageData[`LibCover${id}`] || "",
            epubBase64: storageData[`LibEpub${id}`],
            filename: storageData[`LibFilename${id}`] || `${storageData[`LibTitle${id}`] || "book"}.epub`,
            desc: storageData[`LibDesc${id}`] || ""
        };
    }

    async _findPersonalBookByStoryUrl(normalizedUrl) {
        if (!normalizedUrl || typeof HFStatsLibrary === "undefined") {
            return null;
        }
        const storageData = await this.storage.get("LibArray");
        const libArray = storageData.LibArray || [];
        if (libArray.length === 0) {
            return null;
        }
        const urlKeys = libArray.map(bookId => `LibStoryURL${bookId}`);
        const stored = await this.storage.get(urlKeys);
        for (const bookId of libArray) {
            const storyUrl = stored[`LibStoryURL${bookId}`];
            if (storyUrl && HFStatsLibrary.normalizeUrl(storyUrl) === normalizedUrl) {
                return this._findPersonalBookById(bookId);
            }
        }
        return null;
    }

    _findPublicBookBySourceUrl(normalizedUrl) {
        if (!normalizedUrl || typeof HFStatsLibrary === "undefined") {
            return null;
        }
        const all = [...(this.publicCatalog || []), ...(this.telegramCatalog || [])];
        return all.find(b => b.sourceUrl && HFStatsLibrary.normalizeUrl(b.sourceUrl) === normalizedUrl) || null;
    }

    async _openPersonalBook(book) {
        if (!book) {
            return false;
        }
        const epubBase64 = book.epubBase64;
        if (typeof epubBase64 === "string" && epubBase64.startsWith("lazy:liveread")) {
            let liveUrl = epubBase64.replace("lazy:liveread:", "").replace("lazy:liveread", "");
            if (!liveUrl) {
                liveUrl = book.id;
            }
            const isInsidePlugin = window.location.pathname.includes("/plugin/") || window.location.protocol === "chrome-extension:";
            const lrPath = isInsidePlugin ? "live-reader.html" : "plugin/live-reader.html";
            window.location.href = `${lrPath}?url=${encodeURIComponent(liveUrl)}`;
            return true;
        }
        await this.showBookDetailsPage(book, true);
        return true;
    }

    async openFromStatsEntry(entry) {
        const url = String(entry?.url || "").trim();
        if (!url) {
            return false;
        }

        const hfMatch = url.match(/^hf-library:\/\/(.+)$/i);
        if (hfMatch) {
            await this.ensureCatalogsLoaded();
            const book = this._findPublicBookById(hfMatch[1]);
            if (book) {
                await this.showBookDetailsPage(book, false);
                return true;
            }
        }

        const personalMatch = url.match(/^library:\/\/personal\/(.+)$/i);
        if (personalMatch) {
            const book = await this._findPersonalBookById(personalMatch[1]);
            if (book) {
                return this._openPersonalBook(book);
            }
        }

        if (/^https?:\/\//i.test(url) && typeof HFStatsLibrary !== "undefined") {
            const normalized = HFStatsLibrary.normalizeUrl(url);
            const personalBook = await this._findPersonalBookByStoryUrl(normalized);
            if (personalBook) {
                return this._openPersonalBook(personalBook);
            }

            await this.ensureCatalogsLoaded();
            const publicBook = this._findPublicBookBySourceUrl(normalized);
            if (publicBook) {
                await this.showBookDetailsPage(publicBook, false);
                return true;
            }
        }

        return false;
    }

    async showBookDetailsPage(bookData, isPersonal) {
        const loader = document.getElementById("libraryLoader");
        if (loader) {
            loader.style.display = "flex";
            const statusText = loader.querySelector("div:last-child");
            if (statusText) statusText.textContent = "Fetching book metadata...";
        }

        try {
            let epubData;
            let filename = bookData.filename || `${bookData.title}.epub`;
            let isLiveBook = false;

            if (isPersonal) {
                if (bookData.epubBase64) {
                    epubData = bookData.epubBase64;
                } else {
                    const storageKeys = [`LibEpub${bookData.id}`, `LibFilename${bookData.id}`];
                    const stored = await this.storage.get(storageKeys);
                    epubData = stored[`LibEpub${bookData.id}`];
                    if (stored[`LibFilename${bookData.id}`]) {
                        filename = stored[`LibFilename${bookData.id}`];
                    }
                }
                isLiveBook = typeof epubData === "string" && epubData.startsWith("lazy:");
            }

            // Save in memory
            this.currentDetailsEpub = epubData;
            this.currentDetailsFilename = filename;
            this.currentDetailsId = bookData.id;

            let meta;
            if (bookData.isAudiobook) {
                let fetchedDesc = bookData.desc;
                let fetchedMagnet = null;
                try {
                    const pageRes  = await HttpClient.wrapFetch(bookData.link);
                    const pageHtml = pageRes?.responseText || "";
                    const pageDom  = new DOMParser().parseFromString(pageHtml, "text/html");

                    // Extract full description
                    const descDiv = pageDom.querySelector(".desc");
                    if (descDiv) {
                        fetchedDesc = descDiv.innerHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
                    }

                    // Extract magnet
                    let infoHash = null;
                    const trackers = [];
                    const magnetEl = pageDom.querySelector("a[href^='magnet:']");
                    if (magnetEl) {
                        fetchedMagnet = magnetEl.getAttribute("href");
                    } else {
                        const rows = pageDom.querySelectorAll("tr");
                        for (let row of rows) {
                            const cols = row.querySelectorAll("td");
                            if (cols.length === 2) {
                                const key = cols[0].textContent.trim();
                                const val = cols[1].textContent.trim();
                                if (key.includes("Info Hash")) {
                                    infoHash = val;
                                } else if (val.startsWith("udp://") || val.startsWith("http://") || val.startsWith("https://")) {
                                    trackers.push(val);
                                }
                            }
                        }
                        
                        if (infoHash) {
                            const trackerParams = trackers.map(tr => `&tr=${encodeURIComponent(tr)}`).join("");
                            fetchedMagnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(bookData.title || "Audiobook")}${trackerParams}`;
                        } else {
                            const m = pageHtml.match(/magnet:\?xt=urn:[a-zA-Z0-9:%&=.]+/);
                            if (m) fetchedMagnet = m[0];
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch audiobook details:", e);
                }

                meta = {
                    title: bookData.title,
                    author: bookData.author,
                    description: fetchedDesc,
                    seriesName: "",
                    seriesIndex: "",
                    coverDataUrl: bookData.staticCover
                };
                this.currentDetailsAudiobookLink = bookData.link;
                this.currentDetailsTitle = bookData.title;
                this.currentDetailsMagnet = fetchedMagnet;
            } else if (isLiveBook) {
                // Live books do not have local EPUB binaries to parse
                meta = {
                    title: bookData.title,
                    author: bookData.author,
                    description: "This book is loaded in Live Reader Mode directly from its web source. Chapters are scraped in real-time as you read.",
                    seriesName: "",
                    seriesIndex: "",
                    coverDataUrl: bookData.cover
                };
                this.currentDetailsAudiobookLink = null;
            } else {
                this.currentDetailsAudiobookLink = null;
                if (!isPersonal) {
                    if (bookData.isHF) {
                        const loader = document.getElementById("libraryLoader");
                        const statusText = loader ? loader.querySelector("div:last-child") : null;
                        if (statusText) statusText.textContent = "Downloading book from Hugging Face...";
                        
                        epubData = await HFLibrary.downloadBook(bookData.epubPath, bookData.repoId);
                    } else {
                        epubData = await bookData.generator();
                    }
                }

                if (!epubData) {
                    throw new Error("Unable to retrieve EPUB file contents.");
                }

                this.currentDetailsEpub = epubData;
                this.currentDetailsFilename = filename;

                // Parse metadata
                const fallbackCover = isPersonal ? bookData.cover : (bookData.staticCover || this.defaultPublicCover());
                meta = await this.parseEpubMetadata(epubData, bookData.title, bookData.author, fallbackCover);
            }

            // Update UI elements
            document.getElementById("detailsCoverImg").src = meta.coverDataUrl || (isPersonal ? bookData.cover : this.defaultPublicCover());
            document.getElementById("detailsBookTitle").textContent = meta.title;
            document.getElementById("detailsBookAuthor").textContent = meta.author;

            const descText = meta.description && meta.description !== "No description available." ? meta.description : (bookData.desc || "No description available.");
            document.getElementById("detailsBookDesc").textContent = this.stripHtmlTags(descText);

            // Series tag
            const seriesTag = document.getElementById("detailsBookSeries");
            if (seriesTag) {
                if (meta.seriesName) {
                    seriesTag.style.display = "inline-block";
                    let text = `Series: ${meta.seriesName}`;
                    if (meta.seriesIndex) {
                        text += ` (Vol. ${meta.seriesIndex})`;
                    }
                    seriesTag.textContent = text;
                } else {
                    seriesTag.style.display = "none";
                }
            }

            // Show/Hide details page Download button dynamically based on live reader status
            const downloadBtn = document.getElementById("detailsDownloadBtn");
            if (downloadBtn) {
                downloadBtn.style.display = (isLiveBook || bookData.isAudiobook) ? "none" : "flex";
            }

            const seedrBtn = document.getElementById("detailsSeedrBtn");
            if (seedrBtn) {
                seedrBtn.style.display = bookData.isAudiobook ? "inline-flex" : "none";
            }

            const copyMagnetBtn = document.getElementById("detailsCopyMagnetBtn");
            if (copyMagnetBtn) {
                copyMagnetBtn.style.display = bookData.isAudiobook ? "inline-flex" : "none";
            }

            const readBtn = document.getElementById("detailsStartReadingBtn");
            if (readBtn) {
                readBtn.style.display = bookData.isAudiobook ? "none" : "flex";
                readBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    Read Book
                `;
            }

            const streamBtn = document.getElementById("detailsStreamBtn");
            if (streamBtn) {
                streamBtn.style.display = bookData.isAudiobook ? "inline-flex" : "none";
                streamBtn.disabled = false;
                streamBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>
                    Webtor stream / download
                `;
            }

            // Switch view — must use showView (or set display:block) so the view is actually visible
            if (typeof window.showView === "function") {
                await window.showView("bookDetailsView");
            } else {
                const bdv = document.getElementById("bookDetailsView");
                if (bdv) { bdv.style.display = "block"; bdv.classList.add("active"); }
                document.querySelectorAll(".app-view").forEach(v => { if (v.id !== "bookDetailsView") { v.classList.remove("active"); v.style.display = "none"; } });
                const globalBackBtn = document.getElementById("globalBackBtn");
                if (globalBackBtn) globalBackBtn.style.display = "none";
            }

            if (typeof HFStatsLibrary !== "undefined") {
                let statsUrl = bookData.sourceUrl || "";
                if (isPersonal && bookData.id != null) {
                    const stored = await this.storage.get([`LibStoryURL${bookData.id}`]);
                    statsUrl = stored[`LibStoryURL${bookData.id}`] || statsUrl;
                }
                if (!statsUrl) {
                    statsUrl = isPersonal ? `library://personal/${bookData.id}` : `hf-library://${bookData.id}`;
                }
                HFStatsLibrary.recordEvent({
                    url: statsUrl,
                    mode: "library",
                    action: "open",
                    title: meta.title,
                    author: meta.author,
                    coverUrl: meta.coverDataUrl
                });
            }

        } catch (e) {
            console.error("Failed to show book details:", e);
            alert("Error loading book information: " + e.message);
        } finally {
            if (loader) loader.style.display = "none";
        }
    }



    // Path solver
    resolvePath(baseDir, relativePath) {
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

    // --- MEMORY ZIP EPUB GENERATORS FOR OFFLINE PUBLIC CLASSICS ---

    async generateTimeMachineEPUB() {
        await this.epubViewer.ensureZipAvailable();
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/epub+zip"), { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) });
        
        // 1. mimetype
        await zipWriter.add("mimetype", new zip.TextReader("application/epub+zip"), { compressionMethod: 0 });

        // 2. container.xml
        await zipWriter.add("META-INF/container.xml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));

        // 3. content.opf
        await zipWriter.add("OEBPS/content.opf", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Time Machine</dc:title>
    <dc:creator>H. G. Wells</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">urn:uuid:timemachine-epub-mock</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="Text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`));

        // 4. toc.ncx
        await zipWriter.add("OEBPS/toc.ncx", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:timemachine-epub-mock"/>
  </head>
  <docTitle><text>The Time Machine</text></docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1">
      <navLabel><text>Chapter 1: The Machine Inventor</text></navLabel>
      <content src="Text/ch1.xhtml"/>
    </navPoint>
    <navPoint id="np-2" playOrder="2">
      <navLabel><text>Chapter 2: Into the Far Future</text></navLabel>
      <content src="Text/ch2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`));

        // 5. Chapters XHTML
        await zipWriter.add("OEBPS/Text/ch1.xhtml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1: The Machine Inventor</title></head>
<body>
  <h1>Chapter 1: The Machine Inventor</h1>
  <p>The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated.</p>
  <p>The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses. Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought runs gracefully free of the trammels of precision.</p>
  <p>And he put it to us in this way, marking the points with a lean forefinger—as we sat and watched him, leaning back and smoking—at the earnestness of his demonstration. "You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."</p>
</body>
</html>`));

        await zipWriter.add("OEBPS/Text/ch2.xhtml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2: Into the Far Future</title></head>
<body>
  <h1>Chapter 2: Into the Far Future</h1>
  <p>"I want you to clearly understand that I had reached a speed of over a million miles an hour, flying headlong through time! The sensation was one of pure, unadulterated velocity, a mad rush into the deep dark of tomorrow."</p>
  <p>The sky turned from day to night in the blink of an eye, and the sun chased the moon in a rapid, continuous cycle across the heavens. I watched the great buildings of our era crumble and decay, while new, strange architectural structures rose like mushrooms from the ground, only to fall as quickly as they appeared.</p>
  <p>At last, with a sudden, violent thud, the lever of my machine jammed. I was thrown forward into the soft damp grass of a lush, overgrown garden. Around me rose towering, white marble monuments, and the air was filled with the sweet, intoxicating scent of strange, unknown flowers. I had arrived in the year Eight Hundred and Two Thousand, Seven Hundred and One.</p>
</body>
</html>`));

        return await zipWriter.close();
    }

    async generateAliceEPUB() {
        await this.epubViewer.ensureZipAvailable();
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/epub+zip"), { useWebWorkers: (typeof util !== "undefined" && typeof util.useWebWorkers === "function" && util.useWebWorkers()) });
        
        await zipWriter.add("mimetype", new zip.TextReader("application/epub+zip"), { compressionMethod: 0 });

        await zipWriter.add("META-INF/container.xml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));

        await zipWriter.add("OEBPS/content.opf", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Alice in Wonderland</dc:title>
    <dc:creator>Lewis Carroll</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">urn:uuid:alice-epub-mock</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="Text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`));

        await zipWriter.add("OEBPS/toc.ncx", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:alice-epub-mock"/>
  </head>
  <docTitle><text>Alice in Wonderland</text></docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1">
      <navLabel><text>Chapter 1: Down the Rabbit Hole</text></navLabel>
      <content src="Text/ch1.xhtml"/>
    </navPoint>
    <navPoint id="np-2" playOrder="2">
      <navLabel><text>Chapter 2: The Pool of Tears</text></navLabel>
      <content src="Text/ch2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`));

        await zipWriter.add("OEBPS/Text/ch1.xhtml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1: Down the Rabbit-Hole</title></head>
<body>
  <h1>Chapter 1: Down the Rabbit-Hole</h1>
  <p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"</p>
  <p>So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.</p>
  <p>There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.</p>
</body>
</html>`));

        await zipWriter.add("OEBPS/Text/ch2.xhtml", new zip.TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2: The Pool of Tears</title></head>
<body>
  <h1>Chapter 2: The Pool of Tears</h1>
  <p>"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I’m opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).</p>
  <p>"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I’m sure I shan’t be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can;—but I must be kind to them," thought Alice, "or perhaps they won't walk the way I want to go! Let me see: I’ll give them a new pair of boots every Christmas."</p>
  <p>And she went on planning to herself how she would manage it. "They must go by the carrier," she thought; "and how funny it’ll seem, sending presents to one’s own feet! And how odd the directions will look!"</p>
</body>
</html>`));

        return await zipWriter.close();
    }

    // ─── Anna's Archive Search (5th Library) ────────────────────────────

    _initAnnaSearch() {
        if (this._annaSearchBound) return;
        this._annaSearchBound = true;
        const btn   = document.getElementById("annaSearchBtn");
        const input = document.getElementById("annaSearchInput");
        const doSearch = async () => {
            const q = (input?.value || "").trim();
            if (q) await this._runAnnaSearch(q);
        };
        if (btn)   btn.addEventListener("click", doSearch);
        if (input) input.addEventListener("keypress", e => { if (e.key === "Enter") doSearch(); });
    }

    async _runAnnaSearch(query) {
        const status = document.getElementById("annaSearchStatus");
        const grid   = document.getElementById("annaResultsGrid");
        if (!grid) return;

        if (status) status.textContent = "Searching Anna's Archive…";
        grid.innerHTML = "";

        const DOMAINS = [
            "https://annas-archive.gl",
            "https://annas-archive.pk",
            "https://annas-archive.org"
        ];

        let html = null, domain = DOMAINS[0];
        for (let d of DOMAINS) {
            try {
                const encoded = encodeURIComponent(query);
                const url = `${d}/search?index=&page=1&sort=&src=lgli&display=&q=${encoded}`;
                const res = await HttpClient.wrapFetch(url);
                if (res && res.responseText && res.responseText.length > 500) {
                    html = res.responseText; domain = d; break;
                }
            } catch (_) {}
        }

        if (!html) {
            if (status) status.textContent = "Could not reach Anna's Archive — try enabling CORS proxy.";
            return;
        }

        const dom = new DOMParser().parseFromString(html, "text/html");
        dom.querySelectorAll(".js-partial-matches-show").forEach(el => el.remove());

        const links   = dom.querySelectorAll("a.js-vim-focus.custom-a");
        const results = [];

        for (let lnk of links) {
            if (results.length >= 10) break;
            const href  = lnk.getAttribute("href") || "";
            const title = lnk.textContent.trim();
            if (!title) continue;
            const fullUrl = href.startsWith("http") ? href : `${domain}${href}`;

            // Walk up the DOM to get metadata context
            let ctx = lnk;
            for (let i = 0; i < 6; i++) { if (!ctx.parentElement) break; ctx = ctx.parentElement; }
            const allText = ctx.textContent || "";

            const fmtMatch  = allText.match(/\b(EPUB|PDF|MOBI|AZW3|TXT|DOC|DOCX)\b/i);
            const sizeMatch = allText.match(/(\d+\.?\d*\s*[MKG]B)/i);

            let author = "";
            for (let a of ctx.querySelectorAll("a")) {
                const at = a.textContent.trim();
                const ah = a.getAttribute("href") || "";
                if (ah.includes("search?q=") && at && at !== title && at.split(" ").length <= 4) {
                    author = at; break;
                }
            }

            results.push({
                url:    fullUrl,
                title,
                author,
                format: fmtMatch  ? fmtMatch[1].toUpperCase() : "",
                size:   sizeMatch ? sizeMatch[1] : "",
                md5:    (href.match(/\/md5\/([a-fA-F0-9]{32})/) || [])[1] || ""
            });
        }

        if (results.length === 0) {
            if (status) status.textContent = "No results found.";
            grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No books found for &ldquo;${query}&rdquo;</div>`;
            return;
        }

        if (status) status.textContent = `Found ${results.length} result(s)`;

        for (let book of results) {
            const row  = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border:1px solid var(--reader-border,#333);border-radius:12px;padding:12px 16px;gap:12px;";

            const info = document.createElement("div");
            info.style.cssText = "flex:1;min-width:0;";
            const fmt  = book.format ? `<span style="background:rgba(245,158,11,0.18);color:#f59e0b;padding:2px 7px;border-radius:10px;font-size:0.72rem;font-weight:700;">${book.format}</span>` : "";
            const sz   = book.size   ? `<span style="margin-left:6px;font-size:0.78rem;color:var(--text-muted,#777);">${book.size}</span>` : "";
            info.innerHTML = `
                <div style="font-weight:700;color:var(--text-main,#eee);font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${book.title.replace(/"/g,"&quot;")}">${book.title}</div>
                <div style="font-size:0.8rem;color:var(--text-muted,#777);margin-top:3px;">${book.author || "Unknown Author"}</div>
                <div style="margin-top:5px;">${fmt}${sz}</div>`;

            const actions = document.createElement("div");
            actions.style.cssText = "display:flex;gap:8px;flex-shrink:0;";

            // ── Download: try libgen get.php first, fall back to Anna's Archive page ──
            const dlBtn = document.createElement("button");
            dlBtn.textContent = "Download";
            dlBtn.style.cssText = "background:linear-gradient(135deg,#f59e0b,#ef4444);color:#000;font-weight:700;padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.8rem;white-space:nowrap;";
            dlBtn.onclick = async () => {
                dlBtn.disabled    = true;
                dlBtn.textContent = "Resolving…";
                let directUrl = null;
                try {
                    // Step 1: fetch the Anna's Archive book page to find the libgen ads.php link
                    const bookRes  = await HttpClient.wrapFetch(book.url);
                    const bookHtml = bookRes?.responseText || "";
                    const bookDom  = new DOMParser().parseFromString(bookHtml, "text/html");

                    let adsUrl = null;
                    for (let a of bookDom.querySelectorAll("a[href]")) {
                        const h = a.getAttribute("href");
                        if (h && h.includes("ads.php") && h.includes("md5")) {
                            adsUrl = h.startsWith("http") ? h : `https://libgen.vg${h}`;
                            break;
                        }
                    }

                    // Step 2: fetch ads.php to find get.php direct download link
                    if (adsUrl) {
                        const adsRes  = await HttpClient.wrapFetch(adsUrl);
                        const adsHtml = adsRes?.responseText || "";
                        const adsDom  = new DOMParser().parseFromString(adsHtml, "text/html");
                        for (let a of adsDom.querySelectorAll("a[href]")) {
                            const h = a.getAttribute("href");
                            if (h && h.includes("get.php")) {
                                directUrl = h.startsWith("http") ? h : new URL(h, adsUrl).href;
                                break;
                            }
                        }
                    }
                } catch (_) {}

                if (directUrl) {
                    window.open(directUrl, "_blank");
                } else {
                    // Fallback: open Anna's Archive page so user can download from there
                    window.open(book.url, "_blank");
                }
                dlBtn.disabled    = false;
                dlBtn.textContent = "Download";
            };

            // ── Read Now: fetch epub blob and open reader ──
            const readBtn = document.createElement("button");
            readBtn.textContent = "Read Now";
            readBtn.style.cssText = "background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font-weight:700;padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.8rem;white-space:nowrap;";
            readBtn.onclick = async () => {
                if (readBtn.disabled) return;
                const originalHTML = readBtn.innerHTML;
                readBtn.disabled = true;
                readBtn.innerHTML = `
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px;animation:spin 1s linear infinite;">
                        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/>
                    </svg> Resolving…`;
                readBtn.style.opacity = "0.7";

                const loader = document.getElementById("libraryLoader");
                const resetBtn = () => {
                    readBtn.innerHTML = originalHTML;
                    readBtn.disabled = false;
                    readBtn.style.opacity = "";
                    readBtn.style.background = "";
                    readBtn.style.border = "";
                };

                if (loader) {
                    loader.innerHTML = `
                        <div class="spinner-ring"></div>
                        <div style="color:var(--primary,#a78bfa); font-weight:700; font-size:1rem; text-align:center; max-width:300px; line-height:1.5;">
                            Downloading EPUB…<br>
                            <span style="font-size:0.82rem; color:var(--text-muted,#888); font-weight:400;">"${book.title}"</span>
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted,#888); margin-top:4px;">Large files may take a moment</div>
                    `;
                    loader.style.display = "flex";
                }

                try {
                    let targetUrl = book.url;
                    const bookRes  = await HttpClient.wrapFetch(book.url);
                    const bookHtml = bookRes?.responseText || "";
                    const bookDom  = new DOMParser().parseFromString(bookHtml, "text/html");
                    
                    let adsUrl = null;
                    for (let a of bookDom.querySelectorAll("a[href]")) {
                        const h = a.getAttribute("href");
                        if (h && h.includes("ads.php") && h.includes("md5")) {
                            adsUrl = h.startsWith("http") ? h : `https://libgen.vg${h}`;
                            break;
                        }
                    }
                    if (adsUrl) {
                        const adsRes  = await HttpClient.wrapFetch(adsUrl);
                        const adsHtml = adsRes?.responseText || "";
                        const adsDom  = new DOMParser().parseFromString(adsHtml, "text/html");
                        for (let a of adsDom.querySelectorAll("a[href]")) {
                            const h = a.getAttribute("href");
                            if (h && h.includes("get.php")) {
                                targetUrl = h.startsWith("http") ? h : new URL(h, adsUrl).href;
                                break;
                            }
                        }
                    }

                    // Fallback to IPFS direct links if libgen fails
                    if (targetUrl === book.url) {
                        for (let a of bookDom.querySelectorAll("a[href]")) {
                            const h = a.getAttribute("href");
                            if (h && h.includes("/ipfs/")) {
                                targetUrl = h.startsWith("http") ? h : `https://annas-archive.org${h.startsWith("/") ? "" : "/"}${h}`;
                                break;
                            }
                        }
                    }

                    if (targetUrl === book.url) {
                        throw new Error("No direct EPUB download links found. The file may be hosted on a slow server or requires a captcha. Please click 'Download' to get it manually.");
                    }

                    // Try to download the actual epub file arrayBuffer
                    const fileRes = await HttpClient.wrapFetch(targetUrl, { bypassDirectFetchFallback: true });
                    if (!fileRes || (!fileRes.arrayBuffer && !fileRes.responseBlob)) {
                        throw new Error("Could not extract binary data from response.");
                    }

                    const blob = fileRes.responseBlob || new Blob([fileRes.arrayBuffer], { type: "application/epub+zip" });
                    blob.name = `${book.title}.epub`;

                    if (loader) loader.style.display = "none";

                    readBtn.innerHTML = "✓ Opening…";
                    readBtn.style.background = "#10b981";
                    readBtn.style.border = "none";
                    readBtn.style.opacity = "1";

                    await new Promise(r => setTimeout(r, 150));

                    if (window.libraryManager && typeof window.libraryManager.openBookInReader === "function") {
                        window.libraryManager.openBookInReader(blob);
                    } else {
                        const readerLoader = document.getElementById("epubReaderLoader");
                        if (readerLoader) readerLoader.style.display = "flex";
                        
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

                    setTimeout(resetBtn, 2000);
                } catch (err) {
                    if (loader) loader.style.display = "none";
                    resetBtn();
                    readBtn.innerHTML = "✗ Failed";
                    readBtn.style.background = "#dc2626";
                    readBtn.style.opacity = "1";
                    setTimeout(resetBtn, 3000);
                    alert("Failed to load EPUB: " + (err.message || "Unknown error"));
                }
            };

            actions.appendChild(dlBtn);
            actions.appendChild(readBtn);
            row.appendChild(info);
            row.appendChild(actions);
            grid.appendChild(row);
        }
    }

    // ─── AudioBook Bay Search (6th Library) ─────────────────────────────

    _initAudioBookSearch() {
        if (this._audioBookSearchBound) return;
        this._audioBookSearchBound = true;
        const btn   = document.getElementById("audioBookSearchBtn");
        const input = document.getElementById("audioBookSearchInput");
        const doSearch = async () => {
            const q = (input?.value || "").trim();
            if (q) await this._runAudioBookSearch(q);
        };
        if (btn)   btn.addEventListener("click", doSearch);
        if (input) input.addEventListener("keypress", e => { if (e.key === "Enter") doSearch(); });
    }

    async _runAudioBookSearch(query) {
        const status = document.getElementById("audioBookSearchStatus");
        const grid   = document.getElementById("audioBookResultsGrid");
        if (!grid) return;

        if (status) status.textContent = "Searching AudioBook Bay…";
        grid.innerHTML = "";

        const encoded = encodeURIComponent(query.toLowerCase().replace(/[''":,]/g, ""));
        const searchUrl = `https://audiobookbay.lu/page/1/?s=${encoded}`;

        let html = null;
        try {
            const res = await HttpClient.wrapFetch(searchUrl);
            html = res?.responseText || null;
        } catch (_) {}

        if (!html) {
            if (status) status.textContent = "Could not reach AudioBook Bay — try enabling CORS proxy.";
            return;
        }

        const dom   = new DOMParser().parseFromString(html, "text/html");
        const posts = dom.querySelectorAll("div.post, div.re-ab");
        const results = [];

        for (let post of posts) {
            if (results.length >= 15) break;
            const titleTag = post.querySelector("div.postTitle h2 a");
            if (!titleTag) continue;
            const title   = titleTag.textContent.trim();
            const href    = titleTag.getAttribute("href") || "";
            const link    = href.startsWith("http") ? href : `https://audiobookbay.lu${href.startsWith("/") ? "" : "/"}${href}`;
            const imgTag  = post.querySelector("div.postContent img");
            let image     = imgTag ? (imgTag.getAttribute("src") || "") : "";
            if (image && !image.startsWith("http")) {
                image = `https://audiobookbay.lu${image.startsWith("/") ? "" : "/"}${image}`;
            }
            const sizeTag = post.querySelector("div.postContent p");
            const details = sizeTag ? sizeTag.textContent.trim().replace(/\s+/g, " ").substring(0, 100) : "";
            results.push({ title, link, image, details });
        }

        if (results.length === 0) {
            if (status) status.textContent = "No audiobooks found.";
            grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No audiobooks found for &ldquo;${query}&rdquo;</div>`;
            return;
        }

        if (status) status.textContent = `Found ${results.length} audiobook(s) — click ▶ Stream to listen via WebTorrent`;

        for (let book of results) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid var(--reader-border,#333);border-radius:12px;padding:12px 16px;";

            if (book.cover && !book.cover.includes("default_cover.jpg")) {
                const img = document.createElement("img");
                img.src = book.cover;
                img.style.cssText = "width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;";
                row.appendChild(img);
            } else if (book.image) {
                const img   = document.createElement("img");
                img.src     = book.image;
                img.alt     = book.title;
                img.style.cssText = "width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;";
                img.onerror = () => { img.style.display = "none"; };
                row.appendChild(img);
            }

            const info = document.createElement("div");
            info.style.cssText = "flex:1;min-width:0;";
            info.innerHTML = `
                <div style="font-weight:700;color:var(--text-main,#eee);font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${book.title.replace(/"/g,"&quot;")}">${book.title}</div>
                ${book.details ? `<div style="font-size:0.78rem;color:var(--text-muted,#777);margin-top:3px;">${book.details}</div>` : ""}`;

            const actions = document.createElement("div");
            actions.style.cssText = "display:flex;gap:8px;flex-shrink:0;";

            const pageBtn = document.createElement("button");
            pageBtn.textContent = "Details";
            pageBtn.style.cssText = "background:rgba(139,92,246,0.15);color:#8b5cf6;border:1px solid #8b5cf6;font-weight:600;padding:6px 12px;border-radius:20px;text-decoration:none;font-size:0.8rem;cursor:pointer;";
            
            const bookData = {
                id: `abb_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                title: book.title,
                author: "AudioBook Bay",
                desc: book.details || "Audiobook from AudioBook Bay.",
                link: book.link,
                isAudiobook: true,
                staticCover: book.image || LibraryUI.buildInlineCover("#1a111f", "#ec4899", "AUDIO", "BOOK", "ABB")
            };

            pageBtn.onclick = async (e) => {
                e.stopPropagation();
                await this.showBookDetailsPage(bookData, false);
            };

            row.style.cursor = "pointer";
            row.onclick = async (e) => {
                if (!e.target.closest("button") && !e.target.closest("a")) {
                    await this.showBookDetailsPage(bookData, false);
                }
            };

            actions.appendChild(pageBtn);
            row.appendChild(info);
            row.appendChild(actions);
            grid.appendChild(row);
        }
    }
}
