"use strict";

class Download {
    constructor () {
    }

    /** write blob to "Downloads" directory */
    static save(blob, fileName) {
        if (util.isFirefox()) {
            Download.saveOnFirefox(blob, fileName)
        } else {
            Download.saveOnChrome(blob, fileName)
        }
    }

    static saveOnChrome(blob, fileName) {
        var clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        });
        var a = document.createElement("a");
        let dataUrl = URL.createObjectURL(blob);
        a.href = dataUrl;
        a.download = fileName;
        a.dispatchEvent(clickEvent);
        Download.scheduleDataUrlForDisposal(dataUrl);
    }

    static saveOnFirefox(blob, fileName) {
        let options = {
            url: URL.createObjectURL(blob),
            filename: fileName,
            saveAs: true
        };
        var downloading = browser.downloads.download(options);
        var cleanup = function() { Download.scheduleDataUrlForDisposal(options.url); };
        downloading.then(cleanup, cleanup);
    }

    static scheduleDataUrlForDisposal(dataUrl) {
        // there is no download finished event, so best 
        // we can do is release the URL at arbitary time in future
        let oneMinute = 60 * 1000;
        let disposeUrl = function() { URL.revokeObjectURL(dataUrl); };
        setTimeout(disposeUrl, oneMinute);
    }
}
