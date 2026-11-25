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
     * @param {boolean} [options.makeTabActive] Select the opened tab.
     *
     * @returns {Promise<string>} Captured html.
     */
    async snapshot(url, { delayMs, makeTabActive }) {
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
            return await this.readHtml(tabData.id, delayMs);
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
     * @returns {Promise<string>} Captured html. Rejects if capture fails.
     */
    async readHtml() {
        throw new Error("Browser should implement.");
    }
}

/**
 * @param {number} delayMs
 *
 * @returns The captured html from the injected script
 */
const scriptToInject = async (delayMs) => {
    await new Promise((resolve) => {
        return setTimeout(resolve, delayMs);
    });
    return document.documentElement.outerHTML;
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
     * @param {number} delayMs Delay before capture, in milliseconds.
     * @returns {Promise<string>} Captured HTML. Rejects if injection or capture fails.
     */
    async readHtml(tabId, delayMs) {
        try {
            const scriptDetails = {
                target: { tabId: tabId },
                args: [delayMs],
                func: scriptToInject,
            };
            const results =
                await this.api.scripting.executeScript(scriptDetails);
            return results[0].result;
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
     * @param {number} delayMs Delay before capture, in milliseconds.
     * @returns {Promise<string>} Captured HTML. Rejects if injection or capture fails.
     */
    async readHtml(tabId, delayMs) {
        try {
            const results = await this.api.tabs.executeScript(tabId, {
                code: `(${scriptToInject.toString()})(${delayMs})`,
                runAt: "document_idle",
            });
            return results[0];
        } catch (err) {
            throw new Error(`Failed to inject content script. ${err}`);
        }
    }
}
