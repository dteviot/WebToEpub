"use strict";

parserFactory.register("inkitt.com", () => new InkittParser());

class InkittParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("nav[aria-label=\"Contents\"]");
        if (menu !== null) {
            return util.hyperlinksToChapterList(menu, link => link.href.includes("/chapters/"));
        }
        let storyMatch = dom.baseURI.match(/^(https?:\/\/[^/]+\/stories\/[^/?#]+)/);
        if (storyMatch && dom.baseURI.includes("/chapters/")) {
            let storyDom = (await HttpClient.wrapFetch(storyMatch[1])).responseXML;
            return this.getChapterUrls(storyDom);
        }
        return [];
    }

    findContent(dom) {
        return dom.querySelector("#chapterText, #story-text-container, article.default-style");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter-name, h2.chapter-head-title");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story-title, h1")
            ?? dom.title.replace(/ by .+ at Inkitt$/, "");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("span[id=\"storyAuthor\"], a.author-link .name, a.author-link")?.textContent?.trim()
            ?? dom.querySelector("meta[property=\"author\"]")?.content?.trim();
        return author || super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("div.story-cover-wrapper[data-cover-url]")?.getAttribute("data-cover-url")
            ?? dom.querySelector("meta[property=\"og:image\"], meta[itemprop=\"image\"]")?.content
            ?? util.getFirstImgSrc(dom, "div.story-horizontal-cover");
    }

    extractDescription(dom) {
        return dom.querySelector("p.story-summary")?.textContent?.trim()
            ?? super.extractDescription(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("dd a[href*=\"/genres/\"]")];
        return 0 < genres.length
            ? genres.map(g => g.textContent.trim()).join(", ")
            : super.extractSubject(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button, .inline-comment-bubble, .comment-count");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.story-summary")];
    }
}
