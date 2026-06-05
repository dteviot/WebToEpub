"use strict";

parserFactory.register("wetriedtls.com", () => new WetriedTlsParser());

class WetriedTlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
        this.chaptersSourceTitleMap = new Map();
    }

    async getChapterUrls() {
        const chapterJson = (
            await HttpClient.fetchJson(
                "https://api.wetriedtls.com/chapters/" +
                    this.id +
                    "?page=1&perPage=9999&order=asc"
            )
        ).json;

        const chapters = chapterJson.data.map((chapter) => {
            const seriesUrl =
                "https://wetriedtls.com/series/" + chapter.series.series_slug;

            const mapObj = {
                sourceUrl: `${seriesUrl}/${chapter.chapter_slug}`,
                title: chapter.chapter_title,
            };
            this.chaptersSourceTitleMap.set(mapObj.sourceUrl, mapObj.title);
            return mapObj;
        });

        return chapters;
    }

    async loadEpubMetaInfo(dom) {
        const bookTitle = dom
            .querySelector("section .text-xl")
            .textContent.trim();

        let series = (
            await HttpClient.fetchJson(
                "https://api.wetriedtls.com/query?adult=true&query_string=" +
                    bookTitle
            )
        ).json;

        if (series.data.length === 0) {
            throw new Error("No series found for the given title.");
        }

        const novelData = series.data[0];

        this.id = novelData.id;
        this.title = novelData.title;
        this.thumbnail = novelData.thumbnail;
        this.description = novelData.description;
        return;
    }
    async fetchChapter(url) {
        const dom = (await HttpClient.wrapFetch(url)).responseXML;

        const startString = "self.__next_f.push(";
        const scriptElements = Array.from(dom.querySelectorAll("script"))
            .map((el) => el.textContent)
            .filter((text) => text.includes(startString));

        // Parse all push statements
        const parsedChunks = scriptElements
            .map((script) => {
                const jsonText = script.slice("self.__next_f.push(".length, -1); // remove wrapper
                try {
                    return JSON.parse(jsonText);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        // Find the longest chunk with HTML content
        const htmlChunk = parsedChunks.find(
            ([type, data]) =>
                type === 1 &&
                typeof data === "string" &&
                /<p\b[^>]*>|<div\b[^>]*>|<br\b[^>]*>|<\/?strong\b[^>]*>/i.test(
                    data
                ) && // looks like HTML
                data.length > 1000 // avoid short status chunks
        );

        if (!htmlChunk) throw new Error("No HTML chapter content found.");

        return this.buildChapter(htmlChunk[1], url);
    }

    buildChapter(rawHtml, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let content = util.sanitize(rawHtml);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl() {
        return this.title.trim();
    }

    extractAuthor(dom) {
        if (!dom) return super.extractAuthor(dom);

        const authorLabel = Array.from(
            dom.querySelectorAll("span.text-muted-foreground")
        ).find((el) => el.innerText.trim() === "Author");
        const authorValue = authorLabel?.parentElement?.querySelector(
            ":scope span:last-child"
        );

        return authorValue?.innerText || super.extractAuthor(dom);
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.thumbnail;
    }

    findChapterTitle(dom) {
        return this.chaptersSourceTitleMap.get(dom.baseURI);
    }
}
