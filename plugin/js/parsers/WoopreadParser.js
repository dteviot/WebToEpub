"use strict";

parserFactory.register("woopread.com", () => new WoopreadParser());

class WoopreadParser extends Parser {
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-3xl");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.relative .text-text-secondary")];
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.mb-4:nth-of-type(4) a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.relative");
    }

    async getChapterUrls(dom) {
        // The page only renders the newest chapter group in the DOM (older groups are
        // collapsed and not rendered), but the full list is embedded in the Next.js
        // flight data (self.__next_f.push). Read the full list from there.
        let chapters = WoopreadParser.chaptersFromFlightData(dom);
        if (chapters.length === 0) {
            // The DOM taken from the open browser tab has already been hydrated: the
            // flight data scripts are gone and only the expanded chapter groups exist.
            // Re-fetch the raw page, which still contains the full list.
            try {
                let rawDom = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
                chapters = WoopreadParser.chaptersFromFlightData(rawDom);
            } catch (e) {
                // fall through to the rendered links
            }
        }
        if (chapters.length === 0) {
            return WoopreadParser.chaptersFromRenderedLinks(dom);
        }
        let base = dom.baseURI || "https://woopread.com/";
        return chapters
            .sort((a, b) => a.number - b.number)
            .map(c => ({
                sourceUrl: new URL(`/series/${c.novelSlug}/${c.slug}`, base).href,
                title: c.title
            }));
    }

    static chaptersFromFlightData(dom) {
        let payload = "";
        for (let script of dom.querySelectorAll("script")) {
            let text = script.textContent;
            if (!text.includes("__next_f.push")) {
                continue;
            }
            let match = text.match(/__next_f\.push\((\[[\s\S]*\])\)\s*;?\s*$/);
            if (match === null) {
                continue;
            }
            try {
                let arr = JSON.parse(match[1]);
                if (arr.length > 1 && typeof arr[1] === "string") {
                    payload += arr[1];
                }
            } catch (e) {
                // ignore chunks that are not plain JSON
            }
        }

        let novelSlug = (payload.match(/"novelSlug":"([^"]+)"/) || [])[1];
        let listStart = payload.indexOf("\"chapters\":[{");
        if (!novelSlug || listStart < 0) {
            return [];
        }
        let listEnd = payload.indexOf("],\"novelSlug\"", listStart);
        let listText = payload.substring(listStart, listEnd > 0 ? listEnd : undefined);
        let chapterRegex = /\{"id":"[^"]*","title":"((?:[^"\\]|\\.)*)","number":(\d+),"slug":"((?:[^"\\]|\\.)*)"/g;
        let chapters = [];
        let m;
        while ((m = chapterRegex.exec(listText)) !== null) {
            chapters.push({
                title: JSON.parse(`"${m[1]}"`),
                number: parseInt(m[2]),
                slug: JSON.parse(`"${m[3]}"`),
                novelSlug: novelSlug
            });
        }
        return chapters;
    }

    static chaptersFromRenderedLinks(dom) {
        // Fallback: only the expanded chapter group(s) are available this way
        let links = [...dom.querySelectorAll("main.grow a[href*='/chapter-'], main.grow a[href*='/side-story-']")]
            .filter(a => a.querySelector(".truncate") !== null);
        return links.map(a => ({
            sourceUrl: a.href,
            title: a.querySelector(".truncate").textContent.trim()
        })).reverse();
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.text-2xl");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button[aria-label^='Play from paragraph']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findContent(dom) {
        return dom.querySelector("div[id^='chapter']");
    }
}
