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
     * @param {boolean} [options.makeTabActive] Select the opened tab
     *
     * @returns {Promise<Document>} Captured html as document.
     */
    async openChapterInTab(
        url,
        { delayMs = 5_000, makeTabActive = false } = {},
    ) {
        const notUrl = !(url instanceof URL);
        if (notUrl) {
            throw new TypeError("Expected an URL instance.");
        }

        const html = await this.browserAdapter.snapshot(url, {
            delayMs,
            makeTabActive,
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
