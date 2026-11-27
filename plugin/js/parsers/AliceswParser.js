"use strict";

parserFactory.register("alicesw.com", () => new AliceswParser());

class AliceswParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 5000;
    }

    async getChapterUrls(dom) {
        let scripts = dom.querySelectorAll("script");

        let bookId = null;

        for (let script of scripts) {
            let match = script.textContent.match(/"bookId\\":(\d+)/);

            if (match) {
                bookId = Number(match[1]);
                break;
            }
        }

        let options = {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/json; charset=utf-8"
            }
        };

        let chapterJson = (await HttpClient.fetchJson(`https://www.alicesw.com/api/v1/books/${bookId}/chapters?zh=hans`, options)).json;

        let chapterUrls = chapterJson.data.map((chapter) => {
            return {
                sourceUrl: `https://www.alicesw.com/read/${chapter.chapter_no}`,
                title: chapter.title,
                isIncludeable: !chapter.is_unlocked
            };
        });

        return chapterUrls;
    }

    async fetchChapter(url) {
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("div.page_credit__avvAu:nth-child(2) > a.page_metaLink__NZfbh > span")];
        let tags = [...dom.querySelectorAll(".page_tags__y3hQM > div:nth-child(1) > a")];
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    findContent(dom) {
        return dom.querySelector(".ChapterContent_content__tKggX");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".page_chapterHead__POtGM > h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-cover");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".page_title__4Sgj6");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.page_credit__avvAu:nth-child(1) > a.page_metaLink__NZfbh > span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".page_summary__rvrcK").textContent.trim();
    }
}