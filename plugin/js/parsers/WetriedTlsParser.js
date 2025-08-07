"use strict";

parserFactory.register("wetriedtls.com", () => new WetriedTlsParser());

class WetriedTlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
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

            return {
                sourceUrl: `${seriesUrl}/${chapter.chapter_slug}`,
                title: chapter.chapter_title,
            };
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
        this.author = novelData.author;
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
                /<p>|<div>|<br>|<\/?strong>/.test(data) && // looks like HTML
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

    extractAuthor() {
        return this.author;
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.thumbnail;
    }
}
