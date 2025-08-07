"use strict";

parserFactory.register("reddit.com", () => new RedditParser());

class RedditParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.wiki a")]
            .filter(RedditParser.IsChapterLink)
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return RedditParser.getPost(dom)?.querySelector("[slot='text-body']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".toc a");
    }

    static IsChapterLink(link) {
        let pathname = new URL(link.href).pathname;
        return pathname.startsWith("/r/HFY/comments/");
    }

    static getPost(dom) {
        return dom.querySelector("main shreddit-post");
    }

    findChapterTitle(dom) {
        return RedditParser.getPost(dom).querySelector("h1");
    }
}
