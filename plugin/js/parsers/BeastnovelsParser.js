"use strict";

parserFactory.register("beastnovels.com", () => new BeastnovelsParser());

class BeastnovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const removeNum = document.getElementById("removeChapterNumberCheckbox").checked;
        const cards = [...dom.querySelectorAll("a.chapter-card")]
            .filter(a => a.dataset.premium !== "1");
        return cards.map(a => {
            const num = a.querySelector(".chapter-card__num")?.textContent.replace(/\s+/g, " ").trim();
            const cardTitle = a.querySelector(".chapter-card__title")?.textContent.trim();
            let title;
            if (!removeNum && num && cardTitle) {
                title = `${num} ${cardTitle}`;
            } else {
                title = cardTitle || num || a.textContent.trim();
            }
            return { sourceUrl: a.href, title };
        });
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-header h1");
    }

    // Pulls fields from the Alpine.js x-data novelMeta object (title, author, img).
    // Regex-based because the attribute holds a JS object literal, not JSON.
    getNovelMeta(dom) {
        const container = dom.querySelector("[x-data*=novelMeta]");
        const xdata = container?.getAttribute("x-data");
        if (!xdata) return {};
        const field = (name) => {
            const m = new RegExp(`${name}\\s*:\\s*(['"])(.*?)\\1`).exec(xdata);
            return m ? m[2] : null;
        };
        return { title: field("title"), author: field("author"), img: field("img") };
    }

    extractTitleImpl(dom) {
        return this.getNovelMeta(dom).title
            || dom.querySelector("#heroImg")?.getAttribute("alt")?.trim();
    }

    extractAuthor(dom) {
        return this.getNovelMeta(dom).author || super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return this.getNovelMeta(dom).img
            || dom.querySelector("#heroImg")?.src
            || null;
    }

    extractDescription(dom) {
        const synHeader = [...dom.querySelectorAll("h2")]
            .find(h => /synopsis/i.test(h.textContent));
        const para = synHeader?.nextElementSibling?.querySelector("p");
        return para?.textContent.trim() ?? "";
    }

    extractSubject(dom) {
        const genres = [...dom.querySelectorAll("a[href*=\"/novels?genre=\"]")]
            .map(a => a.textContent.trim())
            .filter(Boolean);
        return genres.join(", ");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "#chapter-ad-wrap, #cmt-ad-wrap");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
