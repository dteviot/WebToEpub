"use strict";

parserFactory.register("m.xsw.tw", () => new XswParser());

const TOC_BASE_URL = "https://m.xsw.tw/";

class XswParser extends Parser {

    constructor() {
        super();

        // Keep normal chapter downloading throttled.
        this.minimumThrottle = 1000;

        // How many TOC pages to request in parallel per round while
        // walking the table of contents. Kept modest on purpose —
        // this is "limited concurrency", not a burst of everything
        // at once.
        this.tocPageBatchSize = 8;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        const info = XswParser.parseTocUrl(dom.URL || dom.baseURI);

        if (info === null) {
            // Couldn't tell what page this is from its URL. Fall back
            // to the safe, slow-but-correct path: walk "next" links
            // one at a time.
            return XswParser.collectByWalkingNext(dom, chapterUrlsUI);
        }

        let startDom = dom;
        let startChapters = XswParser.chaptersFromDom(dom);

        if (startChapters.length === 0) {
            // Case A: started on the novel's info page (e.g.
            // ".../10791860/"), which has no chapter list of its own.
            // Jump straight to page 1 of the TOC.
            const page1Url = `${TOC_BASE_URL}${info.bookId}/page-1.html`;
            startDom = await XswParser.fetchTocPageWithRetry(page1Url);
            if (startDom === null) {
                return [];
            }
            startChapters = XswParser.chaptersFromDom(startDom);
        }

        let chapters = startChapters;
        chapterUrlsUI.showTocProgress(chapters);

        if (chapters.length === 0) {
            return chapters; // genuinely nothing to find on this book
        }

        let pageNumber = (info.pageNumber || 1) + 1;
        let keepGoing = XswParser.nextTocPageUrl(startDom) !== null;

        while (keepGoing) {
            const batchUrls = Array.from(
                { length: this.tocPageBatchSize },
                (_, i) => `${TOC_BASE_URL}${info.bookId}/page-${pageNumber + i}.html`
            );

            const doms = await XswParser.fetchTocPagesConcurrently(
                batchUrls,
                this.tocPageBatchSize
            );

            for (const pageDom of doms) {
                if (pageDom === null) {
                    keepGoing = false; // fetch failed even after retry
                    break;
                }
                const newChapters = XswParser.chaptersFromDom(pageDom);
                if (newChapters.length === 0) {
                    keepGoing = false; // ran past the last real page
                    break;
                }
                chapters = chapters.concat(newChapters);
                chapterUrlsUI.showTocProgress(newChapters);
                if (XswParser.nextTocPageUrl(pageDom) === null) {
                    keepGoing = false; // this page says it's the last one
                    break;
                }
            }

            pageNumber += this.tocPageBatchSize;
        }

        return chapters;
    }

    // Fallback used only if the current page's URL doesn't match the
    // expected shape: walk "next" links one page at a time, same as
    // the original approach, just with retry on failure.
    static async collectByWalkingNext(dom, chapterUrlsUI) {
        let chapters = XswParser.chaptersFromDom(dom);
        chapterUrlsUI.showTocProgress(chapters);

        let nextUrl = XswParser.nextTocPageUrl(dom);
        while (nextUrl !== null) {
            const pageDom = await XswParser.fetchTocPageWithRetry(nextUrl);
            if (pageDom === null) {
                break;
            }
            const newChapters = XswParser.chaptersFromDom(pageDom);
            if (newChapters.length === 0) {
                break;
            }
            chapters = chapters.concat(newChapters);
            chapterUrlsUI.showTocProgress(newChapters);
            nextUrl = XswParser.nextTocPageUrl(pageDom);
        }

        return chapters;
    }

    // Fetch a batch of TOC page URLs with bounded concurrency.
    static async fetchTocPagesConcurrently(urls, concurrency) {
        const results = new Array(urls.length).fill(null);
        let nextIndex = 0;

        async function worker() {
            while (nextIndex < urls.length) {
                const i = nextIndex++;
                results[i] = await XswParser.fetchTocPageWithRetry(urls[i]);
            }
        }

        const workerCount = Math.min(concurrency, urls.length);
        await Promise.all(Array.from({ length: workerCount }, worker));

        return results;
    }

    // Fetch one TOC page, retrying once on failure so a single
    // network hiccup doesn't cut the chapter list short.
    static async fetchTocPageWithRetry(url, retries = 1) {
        for (let attempt = 0; attempt <= retries; ++attempt) {
            try {
                const response = await HttpClient.wrapFetch(url);
                return response.responseXML;
            } catch (err) {
                if (attempt === retries) {
                    console.warn(`XswParser: failed to fetch TOC page ${url}`, err);
                }
            }
        }
        return null;
    }

    // Pull the book id and (if present) the TOC page number out of a
    // URL like "https://m.xsw.tw/10791860/" or
    // "https://m.xsw.tw/10791860/page-3.html".
    static parseTocUrl(url) {
        if (!url) {
            return null;
        }
        const bookMatch = /\/(\d+)(?:\/|$)/.exec(url);
        if (!bookMatch) {
            return null;
        }
        const pageMatch = /page-(\d+)\.html/.exec(url);
        return {
            bookId: bookMatch[1],
            pageNumber: pageMatch ? parseInt(pageMatch[1], 10) : null
        };
    }

    static chaptersFromDom(dom) {
        const links = [
            ...dom.querySelectorAll("div.cover > ul > li > a")
        ];

        return links.map(link => util.hyperLinkToChapter(link));
    }

    static nextTocPageUrl(dom) {
        const next = dom.querySelector("a.next");

        if (!next) {
            return null;
        }

        const href = next.getAttribute("href");

        if (!href) {
            return null;
        }

        return new URL(href, TOC_BASE_URL).href;
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.block_txt2 > h2");
    }

    extractAuthor(dom) {
        const author = dom.querySelector(
            "div.block_txt2 > p:nth-child(2) > a"
        );

        if (author) {
            return author.textContent.trim();
        }

        return super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return "zh-TW";
    }

    extractDescription(dom) {
        const description = dom.querySelector("div.intro_info");

        if (description) {
            return description.textContent.trim();
        }

        return "";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(
            dom,
            "div.block_img2"
        );
    }
}
