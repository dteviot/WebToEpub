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
        let chapters = WoopreadParser.chaptersFromFlightData(dom);
        if (chapters.length === 0) {
            // DOM from the open tab is hydrated, so the embedded chapter list is gone
            let rawDom = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
            chapters = WoopreadParser.chaptersFromFlightData(rawDom);
        }
        return chapters
            .sort((a, b) => a.number - b.number)
            .map(c => ({
                sourceUrl: new URL(`/series/${c.novelSlug}/${c.slug}`, dom.baseURI).href,
                title: c.title
            }));
    }

    // Only the newest chapter group is rendered; the full list is in the Next.js flight data
    static chaptersFromFlightData(dom) {
        let payload = "";
        for (let script of dom.querySelectorAll("script")) {
            let match = script.textContent.match(/__next_f\.push\((\[[\s\S]*\])\)\s*;?\s*$/);
            if (match === null) {
                continue;
            }
            try {
                let arr = JSON.parse(match[1]);
                if (typeof arr[1] === "string") {
                    payload += arr[1];
                }
            } catch (e) {
                continue;
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
