"use strict";

parserFactory.register("goldennovel.com", () => new GoldennovelParser());

class GoldennovelParser extends Parser {
    async getChapterUrls(dom) {
        let chapters = util.hyperlinksToChapterList(dom.querySelector("ul.np-toc"));
        let pageLinks = [...dom.querySelectorAll("nav.np-toc__pager a.page-numbers:not(.next)")];
        let lastPage = Math.max(1, ...pageLinks.map(a => parseInt(a.textContent)).filter(n => !isNaN(n)));
        for (let page = 2; page <= lastPage; ++page) {
            let url = new URL(pageLinks[0].href);
            url.searchParams.set("chpage", page);
            let pageDom = (await HttpClient.fetchHtml(url.href)).responseXML;
            chapters = chapters.concat(util.hyperlinksToChapterList(pageDom.querySelector("ul.np-toc")));
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("div.np-chapter__content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.np-chapter__title");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.np-novel__title");
    }

    extractAuthor(dom) {
        let authorLink = dom.querySelector("ul.np-novel__facts a[href*='/author/']");
        return authorLink ? authorLink.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.np-novel__cover");
    }
}
