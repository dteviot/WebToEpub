parserFactory.register("lunarx.to", () => new LunarxParser());

const LUNARX_API_URL = "https://api.lunarx.to/api";
const LUNARX_SITE_URL = "https://lunarx.to";
const LUNARX_CONTENT_SELECTOR = "div.font-mono.leading-relaxed.select-none";
const LUNARX_MINIMUM_THROTTLE_MS = 3_000;
const LUNARX_CONTENT_TIMEOUT_MS = 30_000;
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
        this.tabLoader = new ChapterTabLoader();
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
        const document = await this.tabLoader.openChapterInTab(new URL(url), {
            timeoutMs: LUNARX_CONTENT_TIMEOUT_MS,
            makeTabActive: true,
            customCaptureScript: {
                script: this.waitForChapterHtml,
                args: {
                    selector: LUNARX_CONTENT_SELECTOR,
                },
            },
        });

        const chapterHtml = document.querySelector(
            LUNARX_CONTENT_SELECTOR,
        ).innerHTML;

        const chapter = Parser.makeEmptyDocForContent(url);
        util.moveChildElements(
            util.sanitize(chapterHtml).body,
            chapter.content,
        );
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
     * Keep this as an arrow-function field: Firefox serializes it into an
     * expression for tabs.executeScript(). Method syntax would be invalid there.
     *
     * @param {string} selector CSS selector for the chapter text container.
     * @returns {Promise<string|null>} Container HTML, or null on timeout.
     */
    waitForChapterHtml = ({ selector }) => {
        return new Promise((resolve) => {
            const observer = new MutationObserver(checkContent);

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

                const html = content.outerHTML;

                observer.disconnect();
                resolve(html);
            }
        });
    };
}
