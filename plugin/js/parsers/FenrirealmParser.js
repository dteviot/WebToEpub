"use strict";

parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmParser extends Parser {
    constructor() {
        super();
    }

    static slugFromUrl(url) {
        let segments = new URL(url).pathname.split("/").filter(s => s !== "");
        return segments[segments.indexOf("series") + 1];
    }

    // Removes zero-width watermark characters, control characters
    // and broken surrogate pairs that make strict converters fail.
    static cleanText(text) {
        let s = String(text ?? "")
            .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
            .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
        let out = "";
        for (let ch of s) {
            let c = ch.codePointAt(0);
            if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 0xFFFE && c !== 0xFFFF)) {
                out += ch;
            }
        }
        return out;
    }

    static chapterHeading(number, title, name) {
        title = title == null ? null : FenrirealmParser.cleanText(title);
        name = name == null ? null : FenrirealmParser.cleanText(name);
        let generic = `Chapter ${number}`;
        if (title == null) {
            return name;
        }
        if (title.trim().toLowerCase() === generic.toLowerCase()) {
            return generic;
        }
        return `${generic} - ${title}`;
    }

    async getChapterUrls(dom) {
        let origin = new URL(dom.baseURI).origin;
        let slug = FenrirealmParser.slugFromUrl(dom.baseURI);
        let chapters = (await HttpClient.fetchJson(`${origin}/api/new/v2/series/${slug}/chapters`)).json;

        return chapters.map(c => ({
            sourceUrl: `${origin}/series/${slug}/${c.slug}`,
            title: FenrirealmParser.chapterHeading(c.number, c.title, c.name),
            isIncludeable: !(c.locked?.price > 0)
        }));
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let newDoc = Parser.makeEmptyDocForContent(url);

        let heading = dom.querySelector(".chapter-view h2")?.textContent
            .replace(/\s+/g, " ").trim();

        let h1 = newDoc.dom.createElement("h1");
        h1.textContent = FenrirealmParser.cleanText(heading) || "Chapter";
        newDoc.content.appendChild(h1);

        let area = dom.querySelector("div.reader-area");
        if (!area) {
            let p = newDoc.dom.createElement("p");
            p.textContent = "[This chapter is locked and could not be downloaded.]";
            newDoc.content.appendChild(p);
            return newDoc.dom;
        }

        area.querySelectorAll("style, [aria-hidden='true']").forEach(e => e.remove());

        for (let src of area.querySelectorAll("p")) {
            let text = FenrirealmParser.cleanText(src.textContent).trim();
            if (text === "") continue;

            let p = newDoc.dom.createElement("p");
            p.textContent = text;
            newDoc.content.appendChild(p);
        }

        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "style");
        super.removeUnwantedElementsFromContentElement(element);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#series-title");
    }

    extractAuthor(dom) {
        return dom.querySelector("#series-info a[href^='/user/']")?.textContent.trim()
            ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return [...dom.querySelectorAll("#series-genres a")]
            .map(a => a.textContent.trim())
            .join(", ");
    }

    // The site serves AVIF covers, which Calibre and online converters
    // can't read. Cover disabled so the EPUB converts cleanly.
    findCoverImageUrl() {
        return null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
