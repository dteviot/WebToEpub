"use strict";

parserFactory.register("mistminthaven.com", () => new MistmintHavenParser());

class MistmintHavenParser extends Parser {
    constructor() {
        super();
        this.chapterTitles = new Map();
    }

    async getChapterUrls(dom) {
        // Free chapters are in the first tab panel, inside a grid of <a> elements
        let chapters = [...dom.querySelectorAll("[role='tabpanel'] a[href*='/novels/'][title^='Chapter']")]
            .map(a => ({
                sourceUrl: a.href,
                title: a.title || a.querySelector(".font-semibold")?.textContent?.trim(),
                isIncludeable: true
            }));

        // If no tab panel found, try broader selector
        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll("a[href*='/novels/'][title^='Chapter']")]
                .filter(a => !a.closest("[aria-hidden='true']"))
                .map(a => ({
                    sourceUrl: a.href,
                    title: a.title || a.querySelector(".font-semibold")?.textContent?.trim(),
                    isIncludeable: true
                }));
        }

        for (let c of chapters) {
            this.chapterTitles.set(c.sourceUrl, c.title);
        }
        return chapters;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let startString = "self.__next_f.push(";
        let scriptElements = [...dom.querySelectorAll("script")]
            .map(el => el.textContent)
            .filter(text => text.includes(startString));

        let parsedChunks = scriptElements
            .map(script => {
                let jsonText = script.slice(startString.length, -1);
                try {
                    return JSON.parse(jsonText);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        let htmlChunk = parsedChunks.find(
            ([type, data]) =>
                type === 1 &&
                typeof data === "string" &&
                /<p\b[^>]*>/i.test(data) &&
                data.length > 1000
        );

        if (!htmlChunk) throw new Error("No HTML chapter content found.");

        let newDoc = Parser.makeEmptyDocForContent(url);
        let content = util.sanitize(htmlChunk[1]);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        // Index page: h1 in the novel info section
        return dom.querySelector("h1.text-text-primary-button") ||
            dom.querySelector("h1");
    }

    extractAuthor(dom) {
        // The author name is in a span next to a person/user SVG icon
        // Look for the SVG with the person icon path, then get the adjacent span
        let personIcons = dom.querySelectorAll("svg");
        for (let svg of personIcons) {
            let path = svg.querySelector("path[d*='M8 6.66667']") ||
                svg.querySelector("path[d*='M2 13.6']");
            if (path) {
                let container = svg.closest("div");
                let authorSpan = container?.querySelector("span");
                if (authorSpan?.textContent?.trim()) {
                    return authorSpan.textContent.trim();
                }
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let altName = dom.querySelector(".text-text-badge")?.textContent?.trim() || "";
        let desc = dom.querySelector(".whitespace-pre-line")?.textContent?.trim() || "";

        return altName + "\n\n" + desc;
    }

    findChapterTitle(dom, webPage) {
        return this.chapterTitles.get(webPage.sourceUrl);
    }

    findCoverImageUrl(dom) {
        // The cover image on the index page has aspect-[2/3] parent
        let img = dom.querySelector(".aspect-\\[2\\/3\\] img") ||
            dom.querySelector("img[alt][data-nimg='fill']");
        if (!img) return null;

        // Extract the actual S3 URL from the Next.js image srcset
        let srcset = img.getAttribute("srcset");
        if (srcset) {
            let match = srcset.match(/url=([^&]+)/);
            if (match) {
                return decodeURIComponent(match[1]);
            }
        }
        return img.src || null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("ins.adsbygoogle, section:has(ins.adsbygoogle)"));
        util.removeElements(element.querySelectorAll("span.inline-block:has(svg)"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [];

        // Build a clean info block with title, metadata, and synopsis
        let infoDiv = document.createElement("div");

        // Title
        let title = dom.querySelector("h1.text-text-primary-button");
        if (title) {
            let h2 = document.createElement("h2");
            h2.textContent = title.textContent.trim();
            infoDiv.appendChild(h2);
        }

        // Other name / alt title
        let altName = dom.querySelector(".text-text-badge");
        if (altName) {
            let p = document.createElement("p");
            p.textContent = altName.textContent.trim();
            infoDiv.appendChild(p);
        }

        // Author, status, and metadata from the info line
        let metaItems = dom.querySelectorAll("h1.text-text-primary-button ~ div .flex.items-center.gap-1 span");
        if (metaItems.length > 0) {
            let p = document.createElement("p");
            let texts = [...metaItems].map(s => s.textContent.trim()).filter(t => t);
            p.textContent = texts.join(" | ");
            infoDiv.appendChild(p);
        }

        // Translator badge
        let translator = dom.querySelector("span.bg-\\[\\#5EA0FE\\]");
        if (translator) {
            let p = document.createElement("p");
            p.textContent = "Translator: " + translator.textContent.trim();
            infoDiv.appendChild(p);
        }

        // Genres
        let genres = [...dom.querySelectorAll("a[href*='?genres=']")];
        if (genres.length > 0) {
            let p = document.createElement("p");
            p.textContent = "Genres: " + genres.map(g => g.textContent.trim()).join(", ");
            infoDiv.appendChild(p);
        }

        if (infoDiv.children.length > 0) {
            nodes.push(infoDiv);
        }

        // Synopsis
        let synopsis = dom.querySelector(".whitespace-pre-line");
        if (synopsis) {
            let synDiv = document.createElement("div");
            let h3 = document.createElement("h3");
            h3.textContent = "Synopsis";
            synDiv.appendChild(h3);
            for (let line of synopsis.textContent.split("\n")) {
                let trimmed = line.trim();
                if (trimmed) {
                    let p = document.createElement("p");
                    p.textContent = trimmed;
                    synDiv.appendChild(p);
                }
            }
            nodes.push(synDiv);
        }

        return nodes;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("a[href*='?genres=']")];
        return tags.map(t => t.textContent?.trim()).join(", ");
    }
}
