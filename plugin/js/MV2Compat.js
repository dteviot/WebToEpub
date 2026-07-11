"use strict";

// Funcs for MV2 compat, used by both Firefox and Chrome MV2 builds
class MV2Compat {
    constructor() {}

    static filterHeaders(e) {
        return {
            requestHeaders: e.requestHeaders.filter(
                h => h.name.toLowerCase() !== "origin" || !h.value.startsWith("moz-extension://")
            )
        };
    }

    static startWebRequestListeners() {
        const api = (typeof browser !== "undefined") ? browser : chrome;
        api.webRequest.onBeforeSendHeaders.addListener(
            MV2Compat.filterHeaders,
            { urls: ["<all_urls>"] },
            ["blocking", "requestHeaders"]
        );
    }

    static injectContentScript(tabId) {
        chrome.tabs.executeScript(
            tabId,
            { file: "js/ContentScript.js", runAt: "document_end" },
            () => {
                if (chrome.runtime.lastError) {
                    util.log(chrome.runtime.lastError.message);
                }
            }
        );
    }
}
