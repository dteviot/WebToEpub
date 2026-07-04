"use strict";

parserFactory.register("shanghaifantasy.com", () => new ShanghaifantasyParser());

class ShanghaifantasyParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let category = dom.querySelector("ul#chapterList")?.getAttribute("data-cat");
        let allChapters = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
            let tocUrl = `https://shanghaifantasy.com/wp-json/fiction/v1/chapters?category=${category}&order=asc&page=${page}&per_page=100`;
            try {
                let json = (await HttpClient.fetchJson(tocUrl)).json;
                if (!json || json.length === 0) {
                    break;
                }
                let chapters = this.buildChapterUrls(json);
                allChapters = allChapters.concat(chapters);
                
                if (chapterUrlsUI) {
                    chapterUrlsUI.showTocProgress(chapters);
                }
                
                if (json.length < 100) {
                    break;
                }
                page++;
                await this.rateLimitDelay();
            } catch (err) {
                if (allChapters.length > 0) {
                    break;
                } else {
                    throw err;
                }
            }
        }
        return allChapters;
    }

    buildChapterUrls(json) {
        return json.filter(a => !a.locked).map(a => ({
            title: a.title,
            sourceUrl: a.permalink 
        }));
    }

    findContent(dom) {
        let content = dom.querySelector("div.contenta");
        let childCount = content.querySelectorAll("div, p").length;
        return (childCount <= 3)
            ? dom.querySelector("body > div.flex")
            : content;
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("p.font-secondary")?.textContent;
        return title || super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let pElements = [...dom.querySelectorAll("div.grid p")];
        let authorElement = pElements.find(p => p.textContent.includes("Author:"));
        if (authorElement) {
            return authorElement.textContent.replace("Author:", "").trim();
        }
        return super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".patreon1, section, nav, button, template, #comments, footer, .hideme");

        for (let e of [...element.querySelectorAll("div")]) {
            e.removeAttribute(":style");
            e.removeAttribute(":class");
            e.removeAttribute("@click.outside");
        }

        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("title")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.md\\:max-w-3xl > img");
        return img ? img.src : super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#editdescription")];
    }
}
