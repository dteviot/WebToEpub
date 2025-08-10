"use strict";

parserFactory.register("jonaxxstories.com", () => new JonaxxstoriesParser());

class JonaxxstoriesParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let lastLink = [...dom.querySelectorAll(".nav-links a:not(.next)")]
            .slice(-1);
        if (0 < lastLink.length)
        {
            let max = parseInt(lastLink[0].textContent);
            let href = lastLink[0].href;
            let index = href.lastIndexOf("/", href.length - 2);
            href = href.substring(0, index + 1);
            for (let i = 2; i <= max; ++i) {
                urls.push(href + i + "/");
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll(".entry-title a")]
            .map(a => util.hyperLinkToChapter(a));
    }
}
