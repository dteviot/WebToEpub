"use strict";

parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
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
        let json = (await HttpClient.fetchJson(`${url}/__data.json?x-sveltekit-invalidated=10001`)).json;
        let data = json.nodes.find(n => n?.data?.[0]?.chapterData !== undefined).data;
        let chapter = data[data[0].chapterData];
        let header = FenrirealmParser.chapterHeading(data[chapter.number], data[chapter.title], data[chapter.name]);
        return this.buildChapter(url, header, data[chapter.content], data[chapter.content_format]);
    }

    buildChapter(url, header, rawContent, format) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let headerElement = newDoc.dom.createElement("h1");
        headerElement.textContent = FenrirealmParser.cleanText(header) || "Chapter";
        newDoc.content.appendChild(headerElement);
        if (rawContent == null) {
            let locked = newDoc.dom.createElement("p");
            locked.textContent = "[This chapter is locked and could not be downloaded.]";
            newDoc.content.appendChild(locked);
            return newDoc.dom;
        }
        rawContent = FenrirealmParser.cleanText(rawContent);
        let parsed = null;
        if (format === "json") {
            try {
                parsed = JSON.parse(rawContent);
            } catch (e) {
                parsed = null;
            }
        }
        if (parsed != null) {
            this.appendNodes(newDoc, newDoc.content, parsed.content);
        } else {
            let content = util.sanitize(rawContent);
            util.moveChildElements(content.body, newDoc.content);
        }
        return newDoc.dom;
    }

    appendNodes(newDoc, parent, nodes) {
        for (let node of nodes ?? []) {
            if (node.type === "text") {
                if (node.text == null) continue;
                let out = newDoc.dom.createTextNode(FenrirealmParser.cleanText(node.text));
                for (let mark of node.marks ?? []) {
                    let tag = {bold: "b", italic: "i"}[mark.type];
                    if (tag) {
                        let w = newDoc.dom.createElement(tag);
                        w.appendChild(out);
                        out = w;
                    }
                }
                parent.appendChild(out);
            } else if (node.type === "hardBreak") {
                parent.appendChild(newDoc.dom.createElement("br"));
            } else if (node.type === "horizontalRule") {
                parent.appendChild(newDoc.dom.createElement("hr"));
            } else if (node.type === "paragraph") {
                let text = FenrirealmParser.cleanText(
                    (node.content ?? []).map(n => n.text ?? "").join("")
                ).trim();
                if (text !== "") {
                    let p = newDoc.dom.createElement("p");
                    this.appendNodes(newDoc, p, node.content);
                    parent.appendChild(p);
                }
            } else {
                this.appendNodes(newDoc, parent, node.content);
            }
        }
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
