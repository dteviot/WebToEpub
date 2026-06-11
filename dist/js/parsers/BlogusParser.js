"use strict";

// This is for sites using the Blogus WordPress theme (e.g., nhvnovels.com, pienovels.com)

parserFactory.register("nhvnovels.com", () => new BlogusParser());
parserFactory.register("pienovels.com", () => new BlogusParser());

class BlogusParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // nhvnovels.com uses .chapter-item[data-url] structure
        let chapterItems = dom.querySelectorAll(".chapter-item[data-url]");
        if (chapterItems.length > 0) {
            let chapters = [...chapterItems].map(item => ({
                sourceUrl: item.getAttribute("data-url"),
                title: item.querySelector(".chapter-title")?.textContent?.trim(),
                isIncludeable: item.getAttribute("data-type") !== "premium"
            }));
            chapters.reverse();
            return chapters;
        }

        // pienovels.com uses .chapter-section with paid/free dropdowns
        let chapters = [];
        // Paid chapters
        for (let a of dom.querySelectorAll(".chapter-section .paid-class2[href]")) {
            let title = a.querySelector(".ch-ul-li p")?.textContent?.trim();
            chapters.push({
                sourceUrl: a.href,
                title: title,
                isIncludeable: false
            });
        }
        // Free chapters
        for (let a of dom.querySelectorAll(".chapter-section .dropdown-content a[href]:not(.paid-class2)")) {
            let title = a.querySelector(".ch-ul-li p")?.textContent?.trim();
            if (title) {
                chapters.push({
                    sourceUrl: a.href,
                    title: title,
                    isIncludeable: true
                });
            }
        }
        // Both lists are newest-first, reverse to chronological
        chapters.reverse();
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".chapter-text");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-title") ||
            dom.querySelector(".title");
    }

    extractAuthor(dom) {
        let author = dom.querySelector(".badge-author")?.textContent?.trim();
        return author || super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".novel-description, .description")?.textContent?.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".novel-image img") ||
            dom.querySelector(".single-left-img .main-img-single");
        return img?.src || null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll(".tsl-preview, .recommendation, .code-block"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".novel-header, .single-new-novel")];
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".badge.genre, .single-tags")];
        return tags.map(t => t.textContent?.trim()).join(", ");
    }
}
