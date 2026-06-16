parserFactory.register("readrift.net", () => new ReadRiftParser());

class ReadRiftParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;

        // Using these to share book information across the different methods of
        // the parser class without making redundant API requests.
        this.novelId = null;
        this.bookMeta = null;
    }

    async loadEpubMetaInfo(dom) {
        /**
         * ReadRift is a client-side Nuxt app that loads slow, so it's a gamble
         * whether the css selector we're targetting has the chapters loaded.
         * Thankfully, I found API requests in the network tab so we can just
         * query all the necessary data cleanly. *
         */
        this.novelId = null;
        this.bookMeta = null;

        try {
            await this.getNovelIdFromApi(dom);
        } catch (err) {
            throw new Error(
                `ReadRiftParser aborted during initialization: ${err.message}`,
            );
        }
    }

    async getNovelIdFromApi(dom) {
        /*
         * The site has an API where you can request the novel id from the server.
         * As such, we're pulling the novel-slug out of the url to pass to that api.
         * Then we make a HTTP request to `/api/v1/books/{novel-slug}`
         */
        try {
            const currentUrl = dom.baseURI;

            const novelSlug = currentUrl.split("/book/")[1]?.replace(/\/$/, "");
            if (!novelSlug) {
                throw new Error(
                    "Could not parse the novel title identifier from the URL.",
                );
            }

            const apiUrl = `https://readrift.net/api/v1/books/${novelSlug}/`;
            const response = await HttpClient.fetchJson(apiUrl);

            const jsonPayload = response.json;
            if (!jsonPayload?.id) {
                throw new Error("The api response didn't contain the novel id");
            }

            this.novelId = String(jsonPayload.id);
            this.bookMeta = jsonPayload;
        } catch (err) {
            throw new Error(`Failed to get novel id from api: ${err.message}`);
        }
    }

    async getChapterUrls() {
        /*
         * Most of the code in the function consists of parsing the html to find
         * ids we need to make an API request to get the chapter urls directly.
         */
        const urls = [];

        if (!this.novelId) {
            return urls;
        }

        // Now we're getting the chapter ids directly from the api so we can
        // populate the urls
        let apiUrl =
            "https://readrift.net/api/v1/books/" +
            this.novelId +
            "/chapters/?limit=10&page=1";

        while (apiUrl) {
            try {
                apiUrl = await this.getChaptersFromApi(apiUrl, urls);
                await util.sleep(300);
            } catch (err) {
                apiUrl = null;
                throw new Error(
                    `ReadRiftParser failed while scanning novel's chapters: ${err.message}`,
                );
            }
        }

        return urls;
    }

    async getChaptersFromApi(apiUrl, urls) {
        const response = await HttpClient.fetchJson(apiUrl);
        const jsonPayload = response.json;
        const chapters = jsonPayload.results;

        if (Array.isArray(chapters) && chapters.length > 0) {
            chapters.forEach((chapter) => {
                if (chapter?.id) {
                    // Since the chapter url pattern is the same for
                    // every chapter on this site, we'll map the chapter
                    // id to the end for every chapter
                    urls.push({
                        sourceUrl: `https://readrift.net/book/chapter/${chapter.id}/`,
                        title:
                            chapter.title ||
                            `Chapter ${chapter.chapter_num || chapter.id}`,
                        // Weirdly enough, is_paid = true means you have access, even for free chapters
                        isIncludeable: chapter.is_paid,
                    });
                } else {
                    throw new Error("API response is missing chapter IDs");
                }
            });

            // Use the pagination engine's built-in pointer string to
            // shift to the next page layout
            apiUrl = jsonPayload.next || null;
        } else {
            apiUrl = null;
        }
        return apiUrl;
    }

    async fetchChapter(url) {
        const match = url.match(/chapter\/(\d+)/);
        if (!match) {
            return super.fetchChapter(url);
        }
        const chapterId = match[1];

        // I also found the chapter API so we can just directly request the content
        const apiUrl = `https://readrift.net/api/v1/books/chapter/${chapterId}/`;

        try {
            const response = await HttpClient.fetchJson(apiUrl);
            const jsonPayload = response.json;

            return await this.createDomForContent(jsonPayload, url);
        } catch (err) {
            throw new Error(
                `ReadRiftParser aborted while fetching chapter: ${err.message}`,
            );
        }
    }

    async createDomForContent(jsonPayload, url) {
        /*
         * Since we went ahead of got the chapter content directly from the api, we need
         * to pass it to WebToEpub in a way it can read. Hence, using the parser method
         * to create an empty doc for the content.
         */

        try {
            const newDoc = Parser.makeEmptyDocForContent(url);

            const titleNode = newDoc.dom.createElement("h1");
            titleNode.className = "chapter-title";
            titleNode.textContent = jsonPayload.title || "";
            newDoc.content.appendChild(titleNode);

            const cleanBody = util.sanitize(jsonPayload.content || "");

            const storyContentWrapper = newDoc.dom.createElement("div");
            storyContentWrapper.className = "tiptap";
            util.moveChildElements(cleanBody.body, storyContentWrapper);
            newDoc.content.appendChild(storyContentWrapper);

            return newDoc.dom;
        } catch (e) {
            throw new Error(
                `Failed to create DOM for chapter content: ${e.message}`,
            );
        }
    }

    findContent(dom) {
        return dom.querySelector(".tiptap");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    extractTitleImpl() {
        /*
         * Since we already grabbed the metadata earlier, we can grab the data
         * instantly out of our shared `bookMeta` variable
         */
        return this.bookMeta?.title || "ReadRift Novel";
    }

    extractAuthor(dom) {
        return this.bookMeta?.author?.title || super.extractAuthor(dom);
    }

    extractDescription() {
        return this.bookMeta?.description || "";
    }

    findCoverImageUrl() {
        return this.bookMeta?.photo || null;
    }
}
