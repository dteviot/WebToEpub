"use strict";

class Download {
    constructor() {
    }

    /**
     * Detect whether we are running as a plain website (as opposed to a Chrome extension).
     * In website mode we always use the anchor-click download path.
     */
    static isWebsiteMode() {
        // If ChromePolyfill loaded, chrome.downloads.download is a stub → website mode
        // A simple flag is set by ChromePolyfill.js to signal this.
        return (typeof window.WTE_WEBSITE_MODE !== "undefined" && window.WTE_WEBSITE_MODE === true);
    }

    static init() {
        if (Download.isWebsiteMode()) {
            // Website mode: always use anchor-click, skip chrome.downloads listener
            Download.saveOn = Download.saveWeb;
            return;
        }
        if (util.isFirefox()) {
            Download.saveOn = Download.saveOnFirefox;
            browser.downloads.onChanged.addListener(Download.onChanged);
        } else {
            Download.saveOn = Download.saveOnChrome;
            chrome.downloads.onChanged.addListener(Download.onChanged);
        }
    }

    static isFileNameIllegalOnWindows(fileName) {
        for (let c of Download.illegalWindowsFileNameChars) {
            if (fileName.includes(c)) {
                return true;
            }
        }
        if (fileName.trim() == "") {
            return true;
        }
        return false;
    }

    static CustomFilename() {
        let CustomFilename = document.getElementById("CustomFilenameInput").value;
        let ToReplace = {
            "%URL_hostname%": (new URL(document.getElementById("startingUrlInput").value))?.hostname,
            "%Title%": document.getElementById("titleInput").value,
            "%Author%": document.getElementById("authorInput").value,
            "%Language%": document.getElementById("languageInput").value,
            "%Chapters_Count%": document.getElementById("spanChapterCount").innerHTML,
            "%Chapters_Downloaded%": document.getElementById("fetchProgress").value - 1,
            "%Filename%": document.getElementById("fileNameInput").value,
        };
        for (const [key, value] of Object.entries(ToReplace)) {
            CustomFilename = CustomFilename.replaceAll(key, value);
        }
        if (Download.isFileNameIllegalOnWindows(CustomFilename)) {
            ErrorLog.showErrorMessage(UIText.Error.errorIllegalFileName(CustomFilename, Download.illegalWindowsFileNameChars));
            return EpubPacker.addExtensionIfMissing("IllegalFileName");
        }
        return EpubPacker.addExtensionIfMissing(CustomFilename);
    }

    /** write blob to "Downloads" directory */
    static save(blob, fileName, overwriteExisting, backgroundDownload) {
        let options = {
            url: URL.createObjectURL(blob),
            filename: fileName,
            saveAs: !backgroundDownload
        };
        if (overwriteExisting) {
            options.conflictAction = "overwrite";
        }
        let cleanup = () => { URL.revokeObjectURL(options.url); };
        return Download.saveOn(options, cleanup);
    }

    static saveOnChrome(options, cleanup) {
        // on Chrome call to download() will resolve when "Save As" dialog OPENS
        // so need to delay return until after file is actually saved
        // Otherwise, we get multiple Save As Dialogs open.
        return new Promise((resolve, reject) => {
            chrome.downloads.download(options,
                downloadId => Download.downloadCallback(downloadId, cleanup, resolve, reject)
            );
        });
    }

    /**
     * Web-native download via anchor click + blob URL.
     * Used in website mode (no chrome.downloads needed).
     */
    static saveWeb(options, cleanup) {
        return new Promise((resolve) => {
            const link = document.createElement("a");
            link.href = options.url;
            link.download = options.filename;
            link.style.display = "none";
            document.body.appendChild(link);
            try {
                // Dispatch a click event to improve reliability in some environments
                let clickEvent = new MouseEvent("click", {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                link.dispatchEvent(clickEvent);
            } catch (e) {
                link.click();
            } finally {
                // Delay removal slightly to allow the click to be processed
                setTimeout(() => { if (link.parentNode) document.body.removeChild(link); }, 200);
            }
            // Revoke blob URL after a longer delay to ensure the browser has started the download
            setTimeout(() => { cleanup(); resolve(); }, 10000);
        });
    }

    static downloadCallback(downloadId, cleanup, resolve, reject) {
        if (downloadId === undefined) {
            reject(new Error(chrome.runtime.lastError.message));
        } else {
            Download.onDownloadStarted(downloadId,
                () => {
                    const tenSeconds = 10 * 1000;
                    setTimeout(cleanup, tenSeconds);
                    resolve();
                }
            );
        }
    }

    static saveOnFirefox(options, cleanup) {
        return browser.runtime.getPlatformInfo().then(platformInfo => {
            if (Download.isAndroid(platformInfo)) {
                Download.saveOnFirefoxForAndroid(options, cleanup);
            } else {
                return browser.downloads.download(options).then(
                    // on Firefox, resolves when "Save As" dialog CLOSES, so no
                    // need to delay past this point.
                    downloadId => Download.onDownloadStarted(downloadId, cleanup)
                );
            }
        }).catch(cleanup);
    }

    static saveOnFirefoxForAndroid(options, cleanup) {
        options.saveAs = false;

        // `browser.downloads.download` isn't implemented in
        // "Firefox for Android" yet, so we starts downloads
        // the same way any normal web page would do it:
        const link = document.createElement("a");
        link.style.display = "none";

        link.href = options.url;
        link.download = options.filename;

        document.body.appendChild(link);
        try {
            // Dispatch a click event to improve reliability
            let clickEvent = new MouseEvent("click", {
                view: window,
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(clickEvent);
        } catch (e) {
            link.click();
        } finally {
            setTimeout(() => { if (link.parentNode) document.body.removeChild(link); }, 200);
        }
        // Revoke blob URL after a delay
        setTimeout(cleanup, 10000);
    }

    static isAndroid(platformInfo) {
        return platformInfo.os.toLowerCase().includes("android");
    }

    static onChanged(delta) {
        if ((delta.state != null) && (delta.state.current === "complete")) {
            let action = Download.toCleanup.get(delta.id);
            if (action != null) {
                Download.toCleanup.delete(delta.id);
                action();
            }
        }
    }

    static onDownloadStarted(downloadId, action) {
        if (downloadId === undefined) {
            action();
        } else {
            Download.toCleanup.set(downloadId, action);
        }
    }
}

Download.toCleanup = new Map();
Download.illegalWindowsFileNameChars = "~/?<>\\:*|\"";
Download.init();