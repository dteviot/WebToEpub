"use strict";

parserFactory.register("shrinecomics.com", () => new ShrineComicsParser());

class ShrineComicsParser extends Parser {
    constructor() {
        super();
    }

    static extractImageUrls(dom) {
        let text = dom.querySelector("script#__NUXT_DATA__")?.textContent ?? dom.documentElement.outerHTML;
        // Nuxt serializers may emit JSON-escaped forward slashes (\/); normalise them
        // so the URL regex matches regardless of how the payload was serialized.
        text = text.replace(/\\\//g, "/");
        let regex = /https?:\/\/cdn2\.zetrofm\.com\/[^"'\\\s]*?chapter_images\/[^"'\\\s]*?\.webp/g;
        let urls = text.match(regex) ?? [];
        return urls.filter((u, i, a) => a.indexOf(u) === i);
    }

    async getChapterUrls(dom) {
        let anchors = [...dom.querySelectorAll("a[href^='/comic/']")]
            .filter(a => a.getAttribute("href").includes("/chapter/"));
        let chapters = anchors.map(a => {
            let p = a.querySelector("p");
            let img = a.querySelector("img");
            let title = (p?.textContent ?? img?.getAttribute("alt") ?? a.textContent ?? "").trim();
            return {
                sourceUrl: a.href,
                title: title
            };
        });
        let seen = new Set();
        return chapters.filter(c => {
            if (seen.has(c.sourceUrl)) {
                return false;
            }
            seen.add(c.sourceUrl);
            return true;
        });
    }

    async fetchChapter(url) {
        let responseXML = (await HttpClient.wrapFetch(url)).responseXML;
        let newDoc = Parser.makeEmptyDocForContent(url);
        let imgUrls = ShrineComicsParser.extractImageUrls(responseXML);
        if (imgUrls.length === 0) {
            throw new Error("No page images found for chapter " + url);
        }
        return this.buildPageWithImageTags(imgUrls, newDoc);
    }

    async buildPageWithImageTags(imgUrls, newDoc) {
        for (let u of imgUrls) {
            let img = newDoc.dom.createElement("img");
            img.src = u;
            newDoc.content.appendChild(img);
        }
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleFromMetadata(dom) {
        let og = dom.querySelector("meta[property='og:title']");
        let title = og?.getAttribute("content") ?? dom.title ?? "";
        return title.replace(/\s*\|\s*Shrine Comics\s*$/, "").trim();
    }

    extractTitleImpl(dom) {
        let h1 = dom.querySelector("h1");
        if (h1 !== null) {
            return h1;
        }
        return this.extractTitleFromMetadata(dom);
    }

    findChapterTitle(dom) {
        let h1 = dom.querySelector("h1");
        if (h1 !== null) {
            return h1;
        }
        return this.extractTitleFromMetadata(dom);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.getAttribute("content") ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        let meta = dom.querySelector("meta[name='description']");
        if (meta) {
            let p = dom.createElement("p");
            p.textContent = meta.getAttribute("content");
            return [p];
        }
        return [];
    }
}
