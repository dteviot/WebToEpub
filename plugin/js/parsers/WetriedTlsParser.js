"use strict";

parserFactory.register("wetriedtls.com", () => new WetriedTlsParser());

class WetriedTlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
        this.chaptersSourceTitleMap = new Map();
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }

    async getChapterUrls() {
        let chapterJson = (await HttpClient.fetchJson(
            `https://api.wetriedtls.com/chapters/${this.id}?page=1&perPage=9999&order=asc`
        )).json;

        let removeNum = document.getElementById("removeChapterNumberCheckbox").checked;
        return chapterJson.data.map(chapter => {
            let titleParts = removeNum
                ? [chapter.chapter_title]
                : [chapter.chapter_name, chapter.chapter_title];
            let item = {
                sourceUrl: `https://wetriedtls.com/series/${chapter.series.series_slug}/${chapter.chapter_slug}`,
                title: titleParts.filter(part => part && part.trim()).join(" - ")
            };
            this.chaptersSourceTitleMap.set(item.sourceUrl, item.title);
            return item;
        });
    }

    async loadEpubMetaInfo(dom) {
        let bookTitle = dom.querySelector("meta[property='og:title']")
            ?.getAttribute("content")
            ?.replace(/\s*-\s*We Tried TLS\s*$/i, "")
            .trim()
            || dom.querySelector("main h1")?.textContent.trim();
        if (!bookTitle) {
            throw new Error("Could not find series title on this page.");
        }

        let series = (await HttpClient.fetchJson(
            "https://api.wetriedtls.com/query?adult=true&query_string=" + encodeURIComponent(bookTitle)
        )).json;
        if (series.data.length === 0) {
            throw new Error("No series found for the given title.");
        }

        let novelData = series.data.find(s => s.title?.trim() === bookTitle) || series.data[0];
        this.id = novelData.id;
        this.title = novelData.title;
        this.thumbnail = novelData.thumbnail;
        this.description = novelData.description;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let article = dom.querySelector("article[data-reader-article]");
        if (article == null) {
            throw new Error("No chapter content found.");
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        let content = util.sanitize(article.innerHTML);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "p:empty");
        this.removeTranslatorHeader(element);
        for (let p of element.querySelectorAll("p")) {
            if (p.textContent.includes("dsc.gg")) {
                p.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    // Only strips the leading credit block, so bold text inside the story is kept
    removeTranslatorHeader(element) {
        let headerPattern = /^(WeTried Translations|Translator|Editor|Discord|◈|_+$|─+$|Chapter \d+)/i;
        while (element.firstElementChild != null) {
            let first = element.firstElementChild;
            let text = first.textContent.trim();
            let isBoldOnly = first.tagName === "P"
                && first.children.length === 1
                && first.firstElementChild.tagName === "STRONG"
                && first.firstElementChild.textContent.trim() === text;
            if (text === "" || headerPattern.test(text) || isBoldOnly) {
                first.remove();
            } else {
                break;
            }
        }
    }

    extractTitleImpl() {
        return this.title.trim();
    }

    extractAuthor(dom) {
        let dt = Array.from(dom?.querySelectorAll("dt") ?? [])
            .find(el => el.textContent.trim() === "Author");
        return dt?.nextElementSibling?.textContent.trim() || super.extractAuthor(dom);
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
