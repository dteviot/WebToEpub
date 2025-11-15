"use strict";

parserFactory.register("novelsonline.net", () => new NovelsOnlineParser());
parserFactory.register("novelsonline.org", () => new NovelsOnlineParser());

class NovelsOnlineParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".chapter-chs a")]
            .map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.textContent,
        });
    }

    findContent(dom) {
        return (
            dom.querySelector("div#contentall")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector(".novel-right .novel-detail-body")];
    }

    extractAuthor(dom) {
        const detailOptionEls = dom.querySelectorAll("div.novel-left > div.novel-details > div.novel-detail-item");
        if (detailOptionEls) {
            for (const el of detailOptionEls) {
                if (el.textContent.includes("Author(s)")) {
                    const author = el.textContent.replace("Author(s)", "").trim();
                    if (author != "" && author != "N/A") {
                        return author;
                    }
                }
            }
        }

        return "<unknown>";
    }
}