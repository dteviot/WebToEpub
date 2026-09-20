"use strict";

parserFactory.register("m.xsw.tw", () => new XswParser());

const TOC_BASE_URL = "https://m.xsw.tw/";

class XswParser extends Parser {

    constructor() {
        super();

        // Keep normal chapter downloading throttled.
        this.minimumThrottle = 1000;

        // Number of TOC pages fetched in parallel.
        this.tocPageBatchSize = 8;
    }

    async getChapterUrls(dom, chapterUrlsUI) {

        /*
         * IMPORTANT:
         *
         * "dom" must remain the original book page.
         *
         * WebToEpub uses this original DOM for:
         * - title
         * - author
         * - description
         * - cover
         *
         * We only use other DOMs for collecting chapter links.
         */


        // ------------------------------------------------------------
        // STEP 1: Collect chapters visible on the original page.
        // ------------------------------------------------------------

        let chapters = [];


        // ------------------------------------------------------------
        // STEP 2: Look for "查看更多章節" FIRST.
        //
        // This is important.
        //
        // We cannot depend on dom.URL here because WebToEpub's DOM
        // object may not provide URL/baseURI.
        //
        // The link itself gives us:
        //
        // /1715166/page-1.html
        // ------------------------------------------------------------

        const moreChaptersLink = dom.querySelector(
            "div.book_more > a"
        );


        if (moreChaptersLink) {

            const href =
                moreChaptersLink.getAttribute("href");

            if (href) {

                const page1Url =
                    new URL(
                        href,
                        TOC_BASE_URL
                    ).href;


                /*
                 * Get the book ID and page number directly from
                 * the "View more chapters" URL.
                 */
                const info =
                    XswParser.parseTocUrl(page1Url);


                if (info !== null) {

                    const page1Dom =
                        await XswParser.fetchTocPageWithRetry(
                            page1Url
                        );


                    if (page1Dom !== null) {

                        const page1Chapters =
                            XswParser.chaptersFromDom(page1Dom);


                        if (page1Chapters.length > 0) {

                            chapters = page1Chapters;

chapterUrlsUI.showTocProgress(
    chapters
);

                            /*
                             * Continue from page 1.
                             */
                            return await XswParser.collectRemainingTocPages(
                                info.bookId,
                                1,
                                page1Dom,
                                chapters,
                                chapterUrlsUI
                            );
                        }
                    }
                }
            }
        }


        // ------------------------------------------------------------
        // STEP 3:
        // If there is no "查看更多章節" link, determine whether
        // the current page itself is a numbered TOC page.
        // ------------------------------------------------------------

        const currentUrl =
            dom.URL || dom.baseURI || null;

        const info =
            XswParser.parseTocUrl(currentUrl);


        /*
         * If we don't know the URL and there was no "查看更多章節"
         * link, we cannot safely construct page-2/page-3/etc.
         *
         * Fall back to following the site's actual "next" link.
         */
        if (info === null) {
            return XswParser.collectByWalkingNext(
                dom,
                chapterUrlsUI,
                chapters
            );
        }


        // ------------------------------------------------------------
        // STEP 4:
        // We are already on a numbered TOC page.
        // Continue collecting later pages.
        // ------------------------------------------------------------

        const currentPageNumber =
            info.pageNumber || 1;


        return await XswParser.collectRemainingTocPages(
            info.bookId,
            currentPageNumber,
            dom,
            chapters,
            chapterUrlsUI
        );
    }


    // ------------------------------------------------------------
    // Collect all remaining TOC pages.
    // ------------------------------------------------------------

    static async collectRemainingTocPages(
        bookId,
        currentPageNumber,
        tocDom,
        chapters,
        chapterUrlsUI
    ) {

        /*
         * Check whether the current TOC page actually has a
         * "next page" link.
         */
        let keepGoing =
            XswParser.nextTocPageUrl(tocDom) !== null;


        while (keepGoing) {

            const firstPageToFetch =
                currentPageNumber + 1;


            /*
             * Build the next batch of page URLs.
             *
             * Example:
             *
             * page-2.html
             * page-3.html
             * ...
             * page-9.html
             */
            const batchUrls =
                Array.from(
                    {
                        length: XswParser
                            .getBatchSize()
                    },
                    (_, i) =>
                        `${TOC_BASE_URL}${bookId}/page-${firstPageToFetch + i}.html`
                );


            const doms =
                await XswParser.fetchTocPagesConcurrently(
                    batchUrls,
                    XswParser.getBatchSize()
                );


            for (
                let i = 0;
                i < doms.length;
                i++
            ) {

                const pageDom =
                    doms[i];


                /*
                 * If the request failed, stop.
                 */
                if (pageDom === null) {
                    keepGoing = false;
                    break;
                }


                const newChapters =
                    XswParser.chaptersFromDom(
                        pageDom
                    );


                /*
                 * No chapters means this page does not contain
                 * another valid TOC page.
                 */
                if (newChapters.length === 0) {
                    keepGoing = false;
                    break;
                }


                /*
                 * Add this page's chapters.
                 */
                chapters =
                    chapters.concat(
                        newChapters
                    );


                chapterUrlsUI.showTocProgress(
                    newChapters
                );


                /*
                 * Remember which page we successfully processed.
                 */
                const processedPageNumber =
                    firstPageToFetch + i;


                currentPageNumber =
                    processedPageNumber;


                /*
                 * If this page has no "next" link, we are finished.
                 */
                if (
                    XswParser.nextTocPageUrl(
                        pageDom
                    ) === null
                ) {

                    keepGoing = false;
                    break;
                }
            }
        }


        return chapters;
    }


    // ------------------------------------------------------------
    // Return the configured batch size.
    // ------------------------------------------------------------

    static getBatchSize() {

        /*
         * Keep this value modest.
         */
        return 8;
    }


    // ------------------------------------------------------------
    // Fallback:
    // Follow actual "next page" links one at a time.
    // ------------------------------------------------------------

    static async collectByWalkingNext(
        dom,
        chapterUrlsUI,
        existingChapters = []
    ) {

        let chapters =
            existingChapters.length > 0
                ? existingChapters
                : XswParser.chaptersFromDom(dom);


        if (existingChapters.length === 0) {
            chapterUrlsUI.showTocProgress(
                chapters
            );
        }


        let nextUrl =
            XswParser.nextTocPageUrl(dom);


        while (nextUrl !== null) {

            const pageDom =
                await XswParser.fetchTocPageWithRetry(
                    nextUrl
                );


            if (pageDom === null) {
                break;
            }


            const newChapters =
                XswParser.chaptersFromDom(
                    pageDom
                );


            if (newChapters.length === 0) {
                break;
            }


            chapters =
                chapters.concat(
                    newChapters
                );


            chapterUrlsUI.showTocProgress(
                newChapters
            );


            nextUrl =
                XswParser.nextTocPageUrl(
                    pageDom
                );
        }


        return chapters;
    }


    // ------------------------------------------------------------
    // Fetch multiple TOC pages with limited concurrency.
    // ------------------------------------------------------------

    static async fetchTocPagesConcurrently(
        urls,
        concurrency
    ) {

        const results =
            new Array(urls.length).fill(null);


        let nextIndex = 0;


        async function worker() {

            while (
                nextIndex < urls.length
            ) {

                const i =
                    nextIndex++;


                results[i] =
                    await XswParser.fetchTocPageWithRetry(
                        urls[i]
                    );
            }
        }


        const workerCount =
            Math.min(
                concurrency,
                urls.length
            );


        await Promise.all(
            Array.from(
                {
                    length: workerCount
                },
                () => worker()
            )
        );


        return results;
    }


    // ------------------------------------------------------------
    // Fetch one TOC page.
    // Retry once if the request fails.
    // ------------------------------------------------------------

    static async fetchTocPageWithRetry(
        url,
        retries = 1
    ) {

        for (
            let attempt = 0;
            attempt <= retries;
            ++attempt
        ) {

            try {

                const response =
                    await HttpClient.wrapFetch(
                        url
                    );


                return response.responseXML;

            } catch (err) {

                if (
                    attempt === retries
                ) {

                    console.warn(
                        `XswParser: failed to fetch TOC page ${url}`,
                        err
                    );
                }
            }
        }


        return null;
    }


    // ------------------------------------------------------------
    // Extract book ID and optional page number from a URL.
    // ------------------------------------------------------------

    static parseTocUrl(url) {

        if (!url) {
            return null;
        }


        /*
         * Example:
         *
         * https://m.xsw.tw/1715166/
         *
         * gives:
         *
         * bookId = 1715166
         */
        const bookMatch =
            /\/(\d+)(?:\/|$)/.exec(
                url
            );


        if (!bookMatch) {
            return null;
        }


        /*
         * Example:
         *
         * /1715166/page-1.html
         *
         * gives:
         *
         * pageNumber = 1
         */
        const pageMatch =
            /\/page-(\d+)\.html/.exec(
                url
            );


        return {
            bookId: bookMatch[1],

            pageNumber:
                pageMatch
                    ? parseInt(
                        pageMatch[1],
                        10
                    )
                    : null
        };
    }


    // ------------------------------------------------------------
    // Extract chapter links from a TOC page.
    // ------------------------------------------------------------

    static chaptersFromDom(dom) {

        if (!dom) {
            return [];
        }


        const links = [
            ...dom.querySelectorAll(
                "div.cover > ul > li > a"
            )
        ];


        return links.map(
            link =>
                util.hyperLinkToChapter(
                    link
                )
        );
    }


    // ------------------------------------------------------------
    // Find the site's next TOC page.
    // ------------------------------------------------------------

    static nextTocPageUrl(dom) {

        if (!dom) {
            return null;
        }


        const next =
            dom.querySelector(
                "a.next"
            );


        if (!next) {
            return null;
        }


        const href =
            next.getAttribute(
                "href"
            );


        if (!href) {
            return null;
        }


        /*
         * The site's href is relative, for example:
         *
         * /1715166/page-2.html
         *
         * Convert it to:
         *
         * https://m.xsw.tw/1715166/page-2.html
         */
        try {

            return new URL(
                href,
                TOC_BASE_URL
            ).href;

        } catch (err) {

            console.warn(
                `XswParser: invalid TOC next URL: ${href}`,
                err
            );

            return null;
        }
    }


    // ------------------------------------------------------------
    // Chapter content.
    // ------------------------------------------------------------

    findContent(dom) {
    const content = dom.querySelector(
        "#nr_body .content.mm-content"
    );

    if (content && content.textContent.trim()) {
        return content;
    }

    return null;
    }

    // ------------------------------------------------------------
    // Book title.
    // ------------------------------------------------------------

    extractTitleImpl(dom) {

        return dom.querySelector(
            "div.block_txt2 > h2"
        );
    }


    // ------------------------------------------------------------
    // Author.
    // ------------------------------------------------------------

    extractAuthor(dom) {

        const author =
            dom.querySelector(
                "div.block_txt2 > p:nth-child(2) > a"
            );


        if (author) {

            return author.textContent.trim();
        }


        return super.extractAuthor(dom);
    }


    // ------------------------------------------------------------
    // Language.
    // ------------------------------------------------------------

    extractLanguage(dom) {

        return "zh-TW";
    }


    // ------------------------------------------------------------
    // Description.
    // ------------------------------------------------------------

    extractDescription(dom) {

        const description =
            dom.querySelector(
                "div.intro_info"
            );


        if (description) {

            return description.textContent.trim();
        }


        return "";
    }


    // ------------------------------------------------------------
    // Cover image.
    // ------------------------------------------------------------

    findCoverImageUrl(dom) {

        return util.getFirstImgSrc(
            dom,
            "div.block_img2"
        );
    }
}
