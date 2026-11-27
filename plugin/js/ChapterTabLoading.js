/**
 * Handles loading chapters in separate tabs to allow sites that use client-side
 * rendering to load chapter content before capturing html.
 */
class ChapterTabLoader {
    /**
     * @param {ChapterTabLoaderBrowserAdapter} [browserAdapter]
     * Specific browser implementations used to capture chapter html. Defaults to the adapter for the current browser.
     */
    constructor(browserAdapter) {
        this.browserAdapter = browserAdapter ?? this.createBrowserAdapter();
    }

    /**
     * Opens the chapter in a new tab, waits for the content to load, then captures the html.
     *
     * @param {URL} url
     * @param {object} [options] Optional options
     * @param {number} [options.delayMs] Delay before capture, in milliseconds
     * @param {number} [timeoutMs] Total time allowed to capture html, in milliseconds.
     * @param {boolean} [options.makeTabActive] Select the opened tab
     * @param {object} [options.customCaptureScript] Custom capture script for capturing html from the tab.
     * @param {function(args?): (string|Promise<string>)} options.customCaptureScript.script The script injected into the tab.
     * It must be an arrow-function. Firefox MV2 uses tabs.executeScript().
     * @param {Record<string, unknown>} [options.customCaptureScript.args] Arguments for the script
     *
     * @returns {Promise<Document>} Captured html as document.
     */
    async openChapterInTab(
        url,
        {
            delayMs = 1_000,
            timeoutMs = 5_000,
            makeTabActive = false,
            customCaptureScript = {},
        } = {},
    ) {
        const notUrl = !(url instanceof URL);

        if (notUrl) {
            throw new TypeError("Expected an URL instance.");
        }

        const haveScript = customCaptureScript.script !== undefined;
        const scriptIsNotFunction =
            typeof customCaptureScript.script !== "function";

        if (haveScript && scriptIsNotFunction) {
            throw new TypeError("Capture script must be a function");
        }

        const html = await this.browserAdapter.snapshot(url, {
            delayMs,
            timeoutMs,
            makeTabActive,
            customCaptureScript,
        });
        return new DOMParser().parseFromString(html, "text/html");
    }

    /**
     * Used by the constructor to automatically assign the right browser adapter
     */
    createBrowserAdapter() {
        return util.isFirefox()
            ? new FirefoxTabLoaderAdapter()
            : new ChromeTabLoaderAdapter();
    }
}
