"use strict";

parserFactory.register("lorenovels.com", () => new LoreNovelsParser());

class LoreNovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const toc = dom.querySelector("ul.wp-block-latest-posts__list");
        if (!toc) {
            return [];
        }

        const items = [...toc.querySelectorAll(
            "a.wp-block-latest-posts__post-title"
        )];

        return this.buildChapterList(items);
    }

    buildChapterList(items) {
        return items
            .reverse() // newest → oldest → reading order
            .map(a => ({
                sourceUrl: a.href,
                title: a.textContent.trim()
            }));
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content.wp-block-post-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(
            element.querySelectorAll(
                "div.wp-block-buttons"
            )
        );
    }
}