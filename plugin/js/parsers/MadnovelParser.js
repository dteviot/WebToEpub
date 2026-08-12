"use strict";

parserFactory.register("madnovel.com", () => new MadnovelParser());
parserFactory.register("novelbuddy.com", () => new MadnovelParser());
parserFactory.register("novelbuddy.io", () => new MadnovelParser());
parserFactory.register("novelbuddy.me", () => new MadnovelParser());

class MadnovelParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractBookSeriesJson(dom) {
        let scripts = dom.querySelectorAll("script[type='application/ld+json']");
        for (let script of scripts) {
            try {
                let json = JSON.parse(script.textContent);
                let bookSeries = (json["@graph"] || []).find(item => item["@type"] === "BookSeries");
                if (bookSeries) {
                    return bookSeries;
                }
            } catch (e) {
                // ignore invalid json and try next script
            }
        }
        return null;
    }

    extractTitleImpl(dom) {
        return this.extractBookSeriesJson(dom)?.name
            ?? dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let bookSeries = this.extractBookSeriesJson(dom);
        if (bookSeries?.author?.name) {
            return bookSeries.author.name;
        }

        let authorLink = [...dom.querySelectorAll("span")]
            .find(span => span.textContent.trim() === "Author:")
            ?.nextElementSibling
            ?.querySelector("a");
        if (authorLink) {
            return authorLink.textContent.trim();
        }

        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let bookSeries = this.extractBookSeriesJson(dom);
        if (bookSeries?.image) {
            return bookSeries.image;
        }

        let ogImage = dom.querySelector("meta[property='og:image']");
        if (ogImage?.content) {
            return ogImage.content;
        }

        return util.getFirstImgSrc(dom, ".img-cover");
    }

    async getChapterUrls(dom) {
        let response = await HttpClient.fetchHtml(dom.baseURI);
        let freshDom = response.responseXML ?? response.dom ?? response;

        let match = (freshDom.querySelector
            ? freshDom.querySelector("script#__NEXT_DATA__").textContent
            : freshDom
        ).match(/"initialManga"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)"/);

        if (!match) {
            throw new Error("Unable to find novel id in __NEXT_DATA__.");
        }

        

        let apiUrl = `https://api.novelbuddy.me/titles/${match[1]}/chapters?cv=`;
        let chaptersResponse = await HttpClient.fetchJson(apiUrl);

        return chaptersResponse.json.data.chapters
            .map((chapter) => ({
                sourceUrl: "https://novelbuddy.me" + chapter.url,
                title: chapter.name
            }))
            .reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.novel-tts-content");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".ads-banner, .my-4");
        util.removeElements(
            [...element.querySelectorAll("div")].filter(
                (div) => div.children.length === 0 && util.isNullOrEmpty(div.textContent.trim())
            )
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter__content h1");
    }
}