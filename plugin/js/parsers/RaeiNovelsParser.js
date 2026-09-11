parserFactory.register("raeinovels.com", () => new RaeiNovelsParser());

class RaeiNovelsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;

        // Using these to share book information across the different methods of
        // the parser class without making redundant API requests.
        this.novelId = null;
        this.bookMeta = null;
    }

    async loadEpubMetaInfo(dom) {
        this.novelId = null;
        this.bookMeta = null;

        try {
            this.novelId = await this.getNovelIdFromUri(dom);
            this.bookMeta = await this.getNovelMetaData();
        } catch (err) {
            throw new Error(
                `RaeiNovelsParser aborted during initialization: ${err.message}`,
            );
        }
    }

    async getNovelIdFromUri(dom) {
        try {
            const currentUrl = dom.baseURI;

            const novelId = currentUrl.split("/novel/")[1]?.split("/")[0];
            if (!novelId) {
                throw new Error(
                    "Could not parse the novel title identifier from the URL.",
                );
            }

            return novelId;
        } catch (err) {
            throw new Error(`Failed to get novel id: ${err.message}`);
        }
    }

    async getNovelMetaData() {
        const apiUrl = `https://api.raeinovels.com/novels/${this.novelId}?public=true`;
        const response = await HttpClient.fetchJson(apiUrl);

        const jsonPayload = response.json;
        if (!jsonPayload) {
            throw new Error("The api response didn't return the metadata");
        }

        return jsonPayload;
    }

    async getChapterUrls() {
        const urls = [];
        if (!this.novelId) return urls;

        const totalChapters = this.bookMeta?.data?.stats?.postedChapters;
        const startChapter = this.bookMeta?.data?.initialChapterNumber;

        if (typeof startChapter !== "number" || typeof totalChapters !== "number") {
            throw new Error(
                `Invalid chapter metadata for novel ${this.novelId}: ` +
                `startChapter (${startChapter}) or totalChapters (${totalChapters}) is missing.`
            );
        }

        for (
            let chapterNum = startChapter;
            chapterNum <= totalChapters;
            chapterNum++
        ) {
            urls.push({
                sourceUrl: `https://raeinovels.com/novel/${this.novelId}/${chapterNum}`,
                title: `Chapter ${chapterNum}`,
                isIncludeable: true,
            });
        }

        return urls;
    }

    async fetchChapter(url) {
        const match = url.match(/\d+$/);
        if (!match) {
            throw new Error(`RaeiNovelsParser failed to match the chapterId for: ${url}`);
        }
        const chapterId = match[0];

        const apiUrl = `https://api.raeinovels.com/novels/${this.novelId}/chapters/${chapterId}?public=true`;

        try {
            const response = await HttpClient.fetchJson(apiUrl);
            const jsonPayload = response.json;
            if (!jsonPayload?.data) {
                throw new Error("API payload missing 'data' field");
            }

            return await this.createDomForContent(jsonPayload, url);
        } catch (err) {
            throw new Error(
                `RaeiNovelsParser aborted while fetching chapter: ${err.message}`,
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
            titleNode.textContent = jsonPayload.data.chapterTitle || "";
            newDoc.content.appendChild(titleNode);

            const cleanBody = util.sanitize(
                jsonPayload.data.chapterContentHtml || "",
            );

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
        return this.bookMeta?.data?.novelTitle || "Novel";
    }

    extractAuthor(dom) {
        return this.bookMeta?.data?.novelAuthor || super.extractAuthor(dom);
    }

    extractDescription() {
        return this.bookMeta?.data?.novelSummary || "";
    }

    findCoverImageUrl() {
        return this.bookMeta?.data?.coverUrl || null;
    }
}
