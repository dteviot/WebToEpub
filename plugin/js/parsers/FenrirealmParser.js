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

    async getChapterUrls(dom) {
        let origin = new URL(dom.baseURI).origin;
        let slug = FenrirealmParser.slugFromUrl(dom.baseURI);
        let chapters = (await HttpClient.fetchJson(`${origin}/api/new/v2/series/${slug}/chapters`)).json;
        return chapters.map(c => ({
            sourceUrl: `${origin}/series/${slug}/${c.slug}`,
            title: `Chapter ${c.number} - ${c.title}`,
            isIncludeable: !(c.locked?.price > 0)
        }));
    }

    async fetchChapter(url) {
        let json = (await HttpClient.fetchJson(`${url}/__data.json?x-sveltekit-invalidated=10001`)).json;
        let data = json.nodes.find(n => n?.data?.[0]?.chapterData !== undefined).data;
        let chapter = data[data[0].chapterData];
        return this.buildChapter(url, data[chapter.title], data[chapter.number], data[chapter.content], data[chapter.content_format]);
    }

    buildChapter(url, title, number, rawContent, format) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        header.textContent = `Chapter ${number} - ${title}`;
        newDoc.content.appendChild(header);
        if (rawContent == null) {
            let locked = newDoc.dom.createElement("p");
            locked.textContent = "[This chapter is locked and could not be downloaded.]";
            newDoc.content.appendChild(locked);
            return newDoc.dom;
        }
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
                parent.appendChild(newDoc.dom.createTextNode(node.text));
            } else if (node.type === "paragraph") {
                let text = (node.content ?? []).map(n => n.text ?? "").join("").trim();
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

    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.content ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
