"use strict";

class MegaLibrary {
    constructor() {
        this.currentFolder = null;
    }

    init() {
        const loadBtn = document.getElementById("megaLibraryLoadButton");
        if (loadBtn) {
            loadBtn.addEventListener("click", () => this.handleLoadFolder());
        }
        
        // Hide mega library button if mega isn't supported/loaded
        const megaBtn = document.getElementById("megaLibraryButton");
        if (megaBtn) {
            if (typeof megajs === "undefined") {
                megaBtn.style.display = "none";
            } else {
                megaBtn.addEventListener("click", () => this.showMegaSection());
            }
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

    async handleLoadFolder() {
        const urlInput = document.getElementById("megaLibraryUrl");
        const statusEl = document.getElementById("megaLibraryStatus");
        const tbody = document.querySelector("#megaLibraryResultsTable tbody");
        
        if (!urlInput || !statusEl || !tbody) return;

        const url = urlInput.value.trim();
        if (!url) {
            statusEl.textContent = "Please enter a valid Mega folder URL.";
            statusEl.style.color = "red";
            return;
        }

        statusEl.textContent = "Loading folder metadata...";
        statusEl.style.color = "#a78bfa";
        tbody.innerHTML = "";

        try {
            // Using megajs browser build
            const folder = await megajs.File.fromURL(url);
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
            
            statusEl.textContent = `Found ${epubFiles.length} EPUB files.`;
            statusEl.style.color = "#10b981"; // success green
            
            // Sort alphabetically
            epubFiles.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            
            this.renderFiles(epubFiles, tbody);
            
        } catch (error) {
            console.error("Mega folder load error:", error);
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = "red";
        }
    }
    
    renderFiles(files, tbody) {
        files.forEach((file, index) => {
            const tr = document.createElement("tr");
            
            const titleTd = document.createElement("td");
            titleTd.style.padding = "5px";
            titleTd.style.borderBottom = "1px solid #444";
            titleTd.textContent = file.name;
            
            const sizeTd = document.createElement("td");
            sizeTd.style.padding = "5px";
            sizeTd.style.borderBottom = "1px solid #444";
            sizeTd.textContent = this.formatSize(file.size);
            
            const actionTd = document.createElement("td");
            actionTd.style.padding = "5px";
            actionTd.style.borderBottom = "1px solid #444";
            
            const dlBtn = document.createElement("button");
            dlBtn.textContent = "Download";
            dlBtn.className = "expandedButton";
            dlBtn.style.padding = "2px 8px";
            dlBtn.style.fontSize = "12px";
            dlBtn.style.width = "auto";
            
            dlBtn.addEventListener("click", () => this.downloadFile(file, dlBtn));
            
            actionTd.appendChild(dlBtn);
            
            tr.appendChild(titleTd);
            tr.appendChild(sizeTd);
            tr.appendChild(actionTd);
            
            tbody.appendChild(tr);
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
