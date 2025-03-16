"use strict";

class Download {
    constructor () {
    }

    static init() {
        Download.saveOn = util.isFirefox() ? Download.saveOnFirefox : Download.saveOnChrome;
        if (util.isFirefox()) {
            Download.saveOn = Download.saveOnFirefox;
            browser.downloads.onChanged.addListener(Download.onChanged);
        } else {
            Download.saveOn = Download.saveOnChrome;
            chrome.downloads.onChanged.addListener(Download.onChanged);
        }
    }

    static isFileNameIllegalOnWindows(fileName) {
        for(let c of Download.illegalWindowsFileNameChars) {
            if (fileName.includes(c)) {
                return true;
            }
        }
        return false;
    }

    static CustomFilename(){
        let CustomFilename = document.getElementById("CustomFilenameInput").value;
        let ToReplace = {
            "%URL_hostname%": (new URL(document.getElementById("startingUrlInput").value))?.hostname,
            "%Title%": document.getElementById("titleInput").value,
            "%Author%": document.getElementById("authorInput").value,
            "%Language%": document.getElementById("languageInput").value,
            "%Chapters_Count%":  document.getElementById("spanChapterCount").innerHTML,
            "%Chapters_Downloaded%":  document.getElementById("fetchProgress").value-1,
            "%Filename%": document.getElementById("fileNameInput").value,
        };
        for (const [key, value] of Object.entries(ToReplace)) {
            CustomFilename = CustomFilename.replaceAll(key, value);
        }
        if (CustomFilename == "") {
            return EpubPacker.addExtensionIfMissing(document.getElementById("fileNameInput").value);
        }
        if (Download.isFileNameIllegalOnWindows(CustomFilename)) {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorIllegalFileName",
                [CustomFilename, Download.illegalWindowsFileNameChars]
            ));
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
        return new Promise((resolve,reject) => {
            chrome.downloads.download(options, 
                downloadId => Download.downloadCallback(downloadId, cleanup, resolve, reject)
            );
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
                Download.saveOnFirefoxForAndroid(options, cleanup)
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
        link.style.display = "hidden";

        link.href = options.url;
        link.download = options.filename;

        document.body.appendChild(link);
        try {
            link.click();
        } finally {
            document.body.removeChild(link);
        }
        cleanup();
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