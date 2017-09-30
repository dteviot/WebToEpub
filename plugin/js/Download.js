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

    /** write blob to "Downloads" directory */
    static save(blob, fileName) {
        let options = {
            url: URL.createObjectURL(blob),
            filename: fileName,
            saveAs: true
        };
        let cleanup = () => { URL.revokeObjectURL(options.url); };
        return Download.saveOn(options, cleanup);
    }

    static saveOnChrome(options, cleanup) {
        let clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        });
        let a = document.createElement("a");
        a.href = options.url;
        a.download = options.filename;
        a.dispatchEvent(clickEvent);
        const oneMinute = 60 * 1000;
        setTimeout(cleanup, oneMinute);
        return Promise.resolve();
    }

    static saveOnFirefox(options, cleanup) {
        return browser.downloads.download(options).then(
            // on Firefox, resolves when "Save As" dialog CLOSES, so no
            // need to delay past this point.
            downloadId => Download.onDownloadStarted(downloadId, cleanup)
        ).catch(cleanup);
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
Download.illegalWindowsFileNameChars = "/?<>\\:*|\"";
Download.init();