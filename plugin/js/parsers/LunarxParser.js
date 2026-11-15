parserFactory.register("lunarx.to", () => new LunarxParser());

const LUNARX_API_URL = "https://api.lunarx.to/api";
const LUNARX_SITE_URL = "https://lunarx.to";
const LUNARX_CONTENT_SELECTOR = "div.font-mono.leading-relaxed.select-none";
const LUNARX_MINIMUM_THROTTLE_MS = 3000;
const LUNARX_TAB_LOAD_TIMEOUT_MS = 30000;
const LUNARX_CONTENT_TIMEOUT_MS = 30000;
const LUNARX_FALLBACK_LANGUAGE = "en";

const LUNARX_URLS = {
    metadata: (slug) => `${LUNARX_API_URL}/novels/title/${slug}`,
    chapterList: (slug) => `${LUNARX_API_URL}/novels/chapters/${slug}`,
    chapterCount: (slug) =>
        `${LUNARX_API_URL}/novels?slug=${encodeURIComponent(slug)}`,
    chapter: (slug, number, language) =>
        `${LUNARX_SITE_URL}/novel/${slug}/${number}?lang=${language}`,
};

const LUNARX_API_MAPPERS = {
    metadata: (response) => ({
        title: response?.novel?.title,
        author: response?.novel?.author,
    }),
    chapters: (response, slug) =>
        response.chapters
            .sort((a, b) => a.chapter - b.chapter)
            .map((chapter) => ({
                sourceUrl: LUNARX_URLS.chapter(
                    slug,
                    chapter.chapter,
                    chapter.language,
                ),
                title: chapter.chapter_title,
                isIncludeable: !chapter.is_coming_soon,
            })),
    chapterCount: (response) => Number(response.novel?.chapters),
};

class LunarxParser extends Parser {
    // eslint-disable-line no-unused-vars
    constructor() {
        super();
        this.minimumThrottle = LUNARX_MINIMUM_THROTTLE_MS;
        this.novelSlug = null;
        this.novelMetadata = null;
    }

    async loadEpubMetaInfo(dom) {
        this.novelSlug = new URL(dom.baseURI).pathname.split("/")[2];
        const response = await HttpClient.fetchJson(
            LUNARX_URLS.metadata(this.novelSlug),
        );
        this.novelMetadata = LUNARX_API_MAPPERS.metadata(response.json);
    }

    extractTitleImpl(dom) {
        return this.novelMetadata?.title || super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        return this.novelMetadata?.author || super.extractAuthor(dom);
    }

    async getChapterUrls() {
        const { json: chapterList } = await HttpClient.fetchJson(
            LUNARX_URLS.chapterList(this.novelSlug),
        );
        const chapters = LUNARX_API_MAPPERS.chapters(
            chapterList,
            this.novelSlug,
        );
        if (chapters.length === 0) {
            return this.getChapterUrlsFromCount();
        }
        return chapters;
    }

    async fetchChapter(url) {
        const html = await this.captureChapterHtmlInTab(url);
        const chapter = Parser.makeEmptyDocForContent(url);
        util.moveChildElements(util.sanitize(html).body, chapter.content);
        return chapter.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    async getChapterUrlsFromCount() {
        await this.rateLimitDelay();
        const { json: novelDetails } = await HttpClient.fetchJson(
            LUNARX_URLS.chapterCount(this.novelSlug),
        );
        const chapterCount = LUNARX_API_MAPPERS.chapterCount(novelDetails);
        if (!Number.isSafeInteger(chapterCount) || chapterCount <= 0) {
            throw new Error(
                `Could not find chapters for ${this.novelSlug}. This parser does not currently handle this site's epubs.`,
            );
        }

        // With only a count, this fallback depends on consecutive chapter numbers
        // starting at one and availability in the fallback language.
        return Array.from({ length: chapterCount }, (_, index) => ({
            sourceUrl: LUNARX_URLS.chapter(
                this.novelSlug,
                index + 1,
                LUNARX_FALLBACK_LANGUAGE,
            ),
            title: `Chapter ${index + 1}`,
        }));
    }

    /**
     * A live tab lets the site's scripts render chapter text before capture.
     *
     * @param {string} url Chapter page URL.
     * @returns {Promise<string>} Chapter HTML. Rejects if loading or capture fails.
     */
    async captureChapterHtmlInTab(url) {
        const extensionApi = typeof browser === "undefined" ? chrome : browser;
        const tab = await extensionApi.tabs.create({
            active: false,
            url,
        });

        try {
            await this.waitForTabLoad(tab.id, extensionApi);

            const html = await this.readChapterHtmlFromTab(
                tab.id,
                extensionApi,
            );
            if (html === null) {
                throw new Error("Timed out waiting for chapter content.");
            }

            return html;
        } finally {
            await extensionApi.tabs
                .remove(tab.id)
                // Catching here because cleanup error is minor and marking a
                // downloaded chapter as failure because tab cleanup isn't a
                // worthy tradeoff
                .catch((error) => console.warn(error));
        }
    }

    /**
     * @param {number} tabId ID of the loaded chapter tab.
     * @param {object} extensionApi Browser extension API namespace (browser or chrome).
     * @returns {Promise<string|null>} Chapter HTML, or null if content never appears.
     * Injection failures reject the promise.
     */
    async readChapterHtmlFromTab(tabId, extensionApi) {
        // Injected code runs in the chapter page, without access to parser constants.
        const args = [LUNARX_CONTENT_SELECTOR, LUNARX_CONTENT_TIMEOUT_MS];
        if (extensionApi.runtime.getManifest().manifest_version >= 3) {
            const [injection] = await extensionApi.scripting.executeScript({
                target: { tabId },
                func: this.waitForChapterHtml,
                args,
            });
            return injection?.result ?? null;
        }

        // Firefox's packaged MV2 build uses the tabs injection API.
        const results = await extensionApi.tabs.executeScript(tabId, {
            code: `(${this.waitForChapterHtml.toString()})(...${JSON.stringify(args)})`,
            runAt: "document_idle",
        });
        return results?.[0] ?? null;
    }

    /**
     * @param {number} tabId ID of the chapter tab.
     * @param {object} extensionApi Browser extension API namespace (browser or chrome).
     * @returns {Promise<void>} Resolves on page load. Rejects on timeout, tab closure,
     * or failure to look up the tab. Page load does not imply chapter text is ready.
     */
    waitForTabLoad(tabId, extensionApi) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                finish(new Error("Timed out loading the chapter tab."));
            }, LUNARX_TAB_LOAD_TIMEOUT_MS);

            function finish(error) {
                clearTimeout(timeout);
                extensionApi.tabs.onUpdated.removeListener(onUpdated);
                extensionApi.tabs.onRemoved.removeListener(onRemoved);
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }

            function onUpdated(updatedTabId, changeInfo, tab) {
                if (
                    updatedTabId === tabId &&
                    changeInfo.status === "complete" &&
                    tab.url !== "about:blank"
                ) {
                    finish();
                }
            }

            function onRemoved(removedTabId) {
                if (removedTabId === tabId) {
                    finish(new Error("The chapter tab was closed."));
                }
            }

            extensionApi.tabs.onUpdated.addListener(onUpdated);
            extensionApi.tabs.onRemoved.addListener(onRemoved);

            extensionApi.tabs.get(tabId).then((tab) => {
                if (tab.status === "complete" && tab.url !== "about:blank") {
                    finish();
                }
            }, finish);
        });
    }

    /**
     * Keep this as an arrow-function field: Firefox serializes it into an
     * expression for tabs.executeScript(). Method syntax would be invalid there.
     *
     * @param {string} selector CSS selector for the chapter text container.
     * @param {number} timeoutMs Maximum time to wait for nonempty chapter text.
     * @returns {Promise<string|null>} Container HTML, or null on timeout.
     */
    waitForChapterHtml = (selector, timeoutMs) => {
        return new Promise((resolve) => {
            const observer = new MutationObserver(checkContent);
            const timeout = setTimeout(() => finish(null), timeoutMs);

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ["class"],
            });

            checkContent();

            function checkContent() {
                const content = document.querySelector(selector);
                if (!content?.textContent.trim()) {
                    return;
                }

                finish(content.innerHTML);
            }

            function finish(html) {
                observer.disconnect();
                clearTimeout(timeout);
                resolve(html);
            }
        });
    };
}
