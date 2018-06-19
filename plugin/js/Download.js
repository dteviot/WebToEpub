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
        // on Chrome call to download() will resolve when "Save As" dialog OPENS
        // so need to delay return until after file is actually saved
        // Otherwise, we get multiple Save As Dialogs open.
        return new Promise(resolve => {
            chrome.downloads.download(options, 
                downloadId => Download.onDownloadStarted(downloadId, 
                    () => { 
                        const tenSeconds = 10 * 1000;
                        setTimeout(cleanup, tenSeconds);
                        resolve(); 
                    }
                )
            );
        });
    }

    static saveOnFirefox(options, cleanup) {
        if (Download.isAndroid()) {
            options.saveAs = false;
        }
        return browser.downloads.download(options).then(
            // on Firefox, resolves when "Save As" dialog CLOSES, so no
            // need to delay past this point.
            downloadId => Download.onDownloadStarted(downloadId, cleanup)
        ).catch(cleanup);
    }

    static isAndroid() {
        let agent = navigator.userAgent.toLowerCase();
        return agent.includes("android") || 
            navigator.platform.toLowerCase().includes("android");
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