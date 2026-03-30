"use strict";

parserFactory.register("truyenmoikk.com", () => new TruyenMoiKKParser());

class TruyenMoiKKParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = await this.getChapterUrlsFromMultipleTocPages(
            dom,
            TruyenMoiKKParser.extractPartialChapterList,
            TruyenMoiKKParser.getUrlsOfTocPages,
            chapterUrlsUI
        );

        chapters.sort((a, b) => {
            let numA = parseInt(a.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            let numB = parseInt(b.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            return numA - numB;
        });

        return chapters.filter((v, i, a) => a.findIndex(t => (t.sourceUrl === v.sourceUrl)) === i);
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let pageNodes = Array.from(dom.querySelectorAll("ul.pagination li a"));
        let maxPage = 1;

        pageNodes.forEach(a => {
            let p = parseInt(a.textContent.trim(), 10);
            if (!isNaN(p) && p > maxPage) {
                maxPage = p;
            }
        });

        let current = new URL(dom.baseURI);
        let basePath = current.pathname.replace(/\/trang-\d+\/?$/, "");
        if (!basePath.endsWith("/")) {
            basePath += "/";
        }

        for (let i = 2; i <= maxPage; i++) {
            let u = new URL(current);
            u.hash = "";
            u.search = "";
            u.pathname = basePath + `trang-${i}`;
            urls.push(u.toString());
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter li a")]
            .map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("article.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story-title")?.textContent.trim();
    }

    extractAuthor(dom) {
        return dom.querySelector("div[itemprop='author'] span[itemprop='name']")?.textContent.trim() || super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let metaThumb = dom.querySelector("meta[itemprop='thumbnailUrl']");
        if (metaThumb && metaThumb.content) {
            return metaThumb.content;
        }
        return util.getFirstImgSrc(dom, ".book");
    }

    findChapterTitle(dom) {
        let titleNode = dom.querySelector("a.chapter-title") || dom.querySelector("h2");
        return titleNode ? titleNode.textContent.trim() : super.findChapterTitle(dom);
    }

    extractSubject(dom) {
        let genres = Array.from(dom.querySelectorAll("a[itemprop='genre']"));
        return genres.map(a => a.textContent.trim()).join(", ");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".desc-text")];
    }
}