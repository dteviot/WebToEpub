
"use strict";
parserFactory.register("novellunar.com", () => new NovelLunarParser());
// Use this function if site's URL is sufficient
parserFactory.registerUrlRule(
    url => NovelLunarParser.urlMeetsSelectionCriteria(url), 
    () => new NovelLunarParser()
);

class NovelLunarParser extends Parser {
    constructor() {
        super();
    }

    static urlMeetsSelectionCriteria(url) {
        try {
            let parsedUrl = new URL(url);
            return parsedUrl.hostname.endsWith("novellunar.com")
                && parsedUrl.pathname.includes("/novel/");
        } catch (err) {
            return false;
        }
    }

    getChapterUrls(dom) {
        let baseUrl = new URL(dom.baseURI);
        let novelUrl = baseUrl.origin + baseUrl.pathname.replace(/\/$/, "");
        let chapterCountElement = dom.querySelector("div.gap-1\\.5:nth-child(2) > span:nth-child(2)");
        let chapterCount = parseInt(chapterCountElement?.textContent?.trim().replace(/[^0-9]/g, ""), 10);

        if (!Number.isInteger(chapterCount) || chapterCount <= 0) {
            return [];
        }

        return Array.from({ length: chapterCount }, (_, index) => {
            let chapterNumber = index + 1;
            return {
                sourceUrl: `${novelUrl}/chapter/${chapterNumber}`,
                title: `Chapter ${chapterNumber}`
            };
        });
    }

    findContent(dom) {
        return dom.querySelector("div.text-gray-800");
    }

    customRawDomToContentStep(chapter, content) {
        this.convertEmptySpansToBreak(chapter.rawDom, content);
    }

    convertEmptySpansToBreak(rawDom, content) {
        [...content.querySelectorAll("span")]
            .filter(s => (s.attributes.length === 0) && (s.textContent.trim() === ""))
            .forEach(s => s.replaceWith(rawDom.createElement("br")));
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".text-2xl");
    }
    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.text-blue-500");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }
    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".inline-block")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    extractDescription(dom) {
        return dom.querySelector("p.text-gray-600:nth-child(1)").textContent.trim();
    }
    findChapterTitle(dom) {
        // typical implementation is find node with the Title
        // Return Title element, OR the title as a string
        return dom.querySelector("h1.text-lg");
    }
    findCoverImageUrl(dom) {
        // Most common implementation is get first image in specified container. e.g.
        return util.getFirstImgSrc(dom, "div[class*='aspect-[3/4]'] > img");
    }
}
