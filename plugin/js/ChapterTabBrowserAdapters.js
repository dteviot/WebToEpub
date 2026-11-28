/**
 * Serves as a port for adapting tab loading to specific browsers
 */
class ChapterTabLoaderBrowserAdapter {
    /**
     * @param {typeof browser | typeof chrome} browserWebExtensionApi
     * Browser extension API namespace used to create tabs and inject scripts
     */
    constructor(browserWebExtensionApi) {
        this.api = browserWebExtensionApi;
    }

    /**
     * @param {URL} url
     * @param {object} [options] Optional options
     * @param {number} [options.delayMs] Delay before capture, in milliseconds.
     * @param {number} [timeoutMs] Total time allowed to capture html, in milliseconds.
     * @param {boolean} [options.makeTabActive] Select the opened tab.
     * @param {object} [options.customCaptureScript] Custom capture script for capturing html from the tab.
     * @param {function(args?): (string|Promise<string>)} options.customCaptureScript.script The script injected into the tab.
     * @param {Record<string, unknown>} [options.customCaptureScript.args] Arguments for the script
     *
     * @returns {Promise<string>} Captured html.
     */
    async snapshot(
        url,
        { delayMs, timeoutMs, makeTabActive, customCaptureScript = {} },
    ) {
        let tabData;
        try {
            tabData = await this.api.tabs.create({
                url: url.href,
                active: makeTabActive,
            });
        } catch (err) {
            throw new Error(`Failed to create a tab for ${url.href}. ${err}`);
        }

        try {
            return await this.readHtml(
                tabData.id,
                delayMs,
                timeoutMs,
                customCaptureScript,
            );
        } finally {
            this.api.tabs
                .remove(tabData.id)
                .catch((err) =>
                    console.warn(`Failed to close chapter tab: ${err}`),
                );
        }
    }

    /**
     * Browser specific implementation to capture html from the chapter loaded in a tab.
     *
     * @param {number} tabId Chapter tab ID.
     * @param {number} [delayMs] Delay before capture, in milliseconds.
     * @param {number} [timeoutMs] Total time allowed to capture html, in milliseconds.
     * @param {object} [customCaptureScript] Custom capture script for capturing html from the tab.
     * @param {function(args?): (string|Promise<string>)} customCaptureScript.script The script injected into the tab.
     * @param {Record<string, unknown>} [customCaptureScript.args] Arguments for the script
     *
     * @returns {Promise<string>} Captured HTML. Rejects if injection or capture fails.
     */
    async readHtml(tabId, delayMs, timeoutMs, customCaptureScript = {}) {
        const script = customCaptureScript.script ?? capturePageHtml;
        const args = customCaptureScript.args ?? {};

        let timeoutId;
        const timeoutPromise = new Promise((_resolve, reject) => {
            timeoutId = setTimeout(
                () => reject(new Error("Capture script timed out.")),
                timeoutMs,
            );
        });

        const capture = async () => {
            if (delayMs > 0) {
                await this.runScript(tabId, waitBeforeCapture, [delayMs]);
            }
            return this.runScript(tabId, script, [args]);
        };

        try {
            const html = await Promise.race([timeoutPromise, capture()]);

            if (typeof html !== "string") {
                throw new TypeError(
                    "Capture script must return an HTML string",
                );
            }
            return html;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * @param {number} tabId Chapter tab ID.
     * @param {function(args?): (string|Promise<string>)} script
     * @param {Record<string, unknown>} args
     * @returns {Promise<string>|undefined} Captured HTML. Rejects if injection or capture fails.
     */
    async runScript() {
        throw new Error(
            "You should be calling a browser adapter, not the port",
        );
    }
}

const capturePageHtml = () => {
    return document.documentElement.outerHTML;
};

const waitBeforeCapture = async (delayMs) => {
    await new Promise((resolve) => {
        return setTimeout(resolve, delayMs);
    });
};

/**
 * Adapts tab script injection for chromium browsers, using manifest v3 to read html
 * @extends ChapterTabLoaderBrowserAdapter
 */
class ChromeTabLoaderAdapter extends ChapterTabLoaderBrowserAdapter {
    constructor() {
        super(browser);
    }

    /**
     * @param {number} tabId Chapter tab ID.
     * @param {function(args?): (string|Promise<string>)} script
     * @param {Record<string, unknown>} args
     * @returns {Promise<string>|undefined} Captured HTML. Rejects if injection or capture fails.
     */
    async runScript(tabId, script, args) {
        try {
            const scriptDetails = {
                target: { tabId: tabId },
                func: script,
                args,
            };
            const results =
                await this.api.scripting.executeScript(scriptDetails);
            return results[0]?.result;
        } catch (err) {
            throw new Error(`Failed to inject content script. ${err}`);
        }
    }
}

/**
 * Adapts tab script injection for firefox browsers, using manifest v2 to read html
 * @extends ChapterTabLoaderBrowserAdapter
 */
class FirefoxTabLoaderAdapter extends ChapterTabLoaderBrowserAdapter {
    constructor() {
        super(browser);
    }

    /**
     * @param {number} tabId Chapter tab ID.
     * @param {function(args?): (string|Promise<string>)} script
     * @param {Record<string, unknown>} args
     * @returns {Promise<string>|undefined} Captured HTML. Rejects if injection or capture fails.
     */
    async runScript(tabId, script, args) {
        try {
            const results = await this.api.tabs.executeScript(tabId, {
                code: `(${script.toString()})(...${JSON.stringify(args)})`,
                runAt: "document_idle",
            });
            return results[0];
        } catch (err) {
            throw new Error(`Failed to inject content script. ${err}`);
        }
    }
}
