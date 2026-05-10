"use strict";
parserFactory.register("mtlbooks.com", () => new MtlBooksParser());

class MtlBooksParser extends Parser {
    constructor() {
        super();
        //Optional Parameters:

        /*
        // Minimum delay (in ms) between page requests. Useful for 403 error prevention.
        // If the sites this parser accesses throttles requests or uses cloudflare, it is recommended to set this.
        this.minimumThrottle = 3000;
        */
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let novelSlug = new URL(dom.baseURI).pathname.split("/");
        novelSlug = novelSlug[2];
        let rawJson = await this.fetchToc(novelSlug, 1);
        let chapterList = this.restructureJsonTocList(rawJson, novelSlug);
        let maxChapter = Math.ceil(
            rawJson.result.total_chapters / rawJson.result.pagination.limit,
        );

        chapterUrlsUI.showTocProgress(chapterList);

        for (let i = 2; i <= maxChapter; i++) {
            rawJson = await this.fetchToc(novelSlug, i);
            let partial = this.restructureJsonTocList(rawJson, novelSlug);
            chapterUrlsUI.showTocProgress(partial);
            chapterList.push(...partial);
        }

        return chapterList;
    }

    fetchOptions(payload) {
        return {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        };
    }

    async fetchToc(slug, iteration) {
        let apiUrl = "https://alpha.mtlbooks.com/api/v1/chapters/list";

        let payload = {
            novel_slug: slug,
            page: iteration,
            order: "ASC",
        };

        return (await HttpClient.fetchJson(apiUrl, this.fetchOptions(payload)))
            .json;
    }

    restructureJsonTocList(json, novelSlug) {
        json = json.result.chapter_lists;
        return json.map(({ chapter_slug, chapter_title }) => ({
            // replace slug with full URL
            sourceUrl: `https://mtlbooks.com/novel/${novelSlug}/${chapter_slug}`,
            title: chapter_title,
        }));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    jsonToHtml(url, apiJson) {
        let chapter = apiJson.result.chapter;
        let newDoc = Parser.makeEmptyDocForContent(url);
        if (chapter.chapter_title) {
            this.appendElement(newDoc, "h1", chapter.chapter_title);
        }

        let paragraphs = chapter.content
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter((p) => !util.isNullOrEmpty(p));

        for (let text of paragraphs) {
            this.appendElement(newDoc, "p", text);
        }

        return newDoc.dom;
    }

    appendElement(newDoc, tag, text) {
        const el = newDoc.dom.createElement(tag);
        el.textContent = text; // safe even if text has <, >, quotes, etc.
        newDoc.content.appendChild(el);
    }

    extractTitleImpl() {
        return this.title;
    }

    async loadEpubMetaInfo(dom) {
        let slug = new URL(dom.baseURI).pathname.split("/");
        let apiUrl = `https://alpha.mtlbooks.com/api/v1/novels/${slug[2]}`;

        let data = (await HttpClient.fetchJson(apiUrl)).json;
        data = data.result;
        this.title = data.name;
        this.description = data.description;
        this.img = data.thumbnail;
        this.genres = data.genres;
        this.tags = data.tags;
        return;
    }

    // Genre of the story
    extractSubject() {
        let genres = this.genres || [];
        let tags = this.tags || [];
        return [...genres, ...tags].map((e) => e.textContent).join(", ");
    }

    extractDescription() {
        if (util.isNullOrEmpty(this.description)) {
            return "";
        }
        let text = this.description.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        return text;
    }

    findCoverImageUrl() {
        let imgUrl = `https://wsrv.nl/?url=https://cdn.mtlbooks.com/poster/${this.img}&w=300&h=400&fit=cover&output=jpg&maxage=3M`;
        return imgUrl;
    }

    // Optional, supply if need to chase hyperlinks in page to get all chapter content
    // or site can send challenge pages for some chapters

    async fetchChapter(url) {
        let u = new URL(url);
        let parts = u.pathname.split("/").filter(Boolean);

        let novelSlug = parts[1];
        let chapterSlug = parts[2];
        let payload = {
            novel_slug: novelSlug,
            chapter_slug: chapterSlug,
        };
        let apiUrl = "https://alpha.mtlbooks.com/api/v1/chapters/read";
        let json = (
            await HttpClient.fetchJson(apiUrl, this.fetchOptions(payload))
        ).json;
        return this.jsonToHtml(url, json);
    }
}
