parserFactory.register("transcendentaltls.com", () => new TranscendentalTlsParser());

class TranscendentalTlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        // The table of contents uses tailscale css class names based on height,
        // so using them as css selectors will most likely break quickly. For
        // better stability, I'm creating the chapter urls from the api instead.
        const urlObj = new URL(dom.baseURI);
        const novelTag = urlObj.searchParams.get("novelTag");
        if (!novelTag) return [];

        const apiUrl = `https://transcendentaltls.com/api/general/novelDetails?novelTag=${novelTag}`;

        try {
            const response = await HttpClient.fetchJson(apiUrl);
            const { chapters = [] } = response.json;

            return chapters
                .filter(ch => {
                    // Since the API highlights which chapters are available or
                    // locked, I chose to just filter the ones we can actually
                    // read
                    return ch.status?.type === "PUBLISHED" && !ch.isLocked;
                })
                .map(ch => {
                    const chapterUrl = `https://transcendentaltls.com/novelDetails/chapter?novelTag=${novelTag}&chapterNumber=${ch.chapterNumber}`;

                    const cleanTitle = ch.title && ch.title.trim() !== ""
                        ? `Chapter ${ch.chapterNumber} - ${ch.title.replace(/^—\s*/, "").trim()}`
                        : `Chapter ${ch.chapterNumber}`;

                    return {
                        sourceUrl: chapterUrl,
                        title: cleanTitle,
                        newArc: null
                    };
                })
                // The API payload returns chapters inside reverse order (e.g.
                // 315 down to 1) so I flipped it
                .reverse();

        } catch (err) {
            throw new Error(`TranscendentTLSParser aborted while generating TOC from API: ${err.message}`);
        }
    }

    async fetchChapter(url) {
        // Since the site uses CSR, I use the api to get the chapter content
        // instead
        const urlObj = new URL(url);
        const novelTag = urlObj.searchParams.get("novelTag");
        const chapterNumber = urlObj.searchParams.get("chapterNumber");

        if (!novelTag || !chapterNumber) {
            return super.fetchChapter(url);
        }

        const apiUrl = `https://transcendentaltls.com/api/general/chapter?novelTag=${novelTag}&chapterNumber=${chapterNumber}`;

        try {
            const response = await HttpClient.fetchJson(apiUrl);
            const { chapter, novel } = response.json;

            const chapterTitle = chapter.title || `${novel.name} - Chapter ${chapter.chapterNumber}`;
            const storyHtml = chapter.content?.html || "Failed to find content";

            const virtualHtml = `
                <html>
                    <body>
                        <h1 class="chapter-title">${chapterTitle}</h1>
                        <div class="chapter-content">${storyHtml}</div>
                    </body>
                </html>
            `;

            return util.sanitize(virtualHtml);
        } catch (err) {
            throw new Error(`TranscendentTLSParser aborted while fetching chapter: ${err.message}`);
        }
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".text-3xl");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".md\\:w-1\\/3 > div:nth-child(1)");
    }
}
