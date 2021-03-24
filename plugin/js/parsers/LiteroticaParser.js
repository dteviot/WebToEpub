/*
  Parser for https://www.literotica.com
*/
"use strict";

parserFactory.register("literotica.com", function () {
    return new LiteroticaParser();
});

class LiteroticaParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = this.chaptersFromMemberPage(dom);
        return Promise.resolve(chapters);
    }

    chaptersFromMemberPage(dom) {
        let links = [
            ...dom.querySelectorAll(
                "td.fc a, div.b-story-list-box h3 a, div.b-story-list h3 a"
            ),
        ];
        if (0 < links.length) {
            return links.map((a) => util.hyperLinkToChapter(a));
        }
        let content = dom.querySelector("div#content");
        return content === null ? [] : util.hyperlinksToChapterList(content);
    }

    findContent(dom) {
        return LiteroticaParser.contentForPage(dom);
    }

    static contentForPage(dom) {
        return dom.querySelector("div.aa_ht");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.j_eQ");
    }

    fetchChapter(url) {
        let dom = null;
        return HttpClient.wrapFetch(url)
            .then(function (xhr) {
                dom = xhr.responseXML;
                let pageUrls = LiteroticaParser.findUrlsOfAdditionalPagesMakingChapter(
                    url,
                    dom
                );
                return Promise.all(
                    pageUrls.map(LiteroticaParser.fetchAdditionalPageContent)
                );
            })
            .then(function (fragments) {
                return LiteroticaParser.assembleChapter(dom, fragments);
            });
    }

    static findUrlsOfAdditionalPagesMakingChapter(url, dom) {
        const paginationItems = dom.querySelectorAll("div.l_bH a.l_bJ");
        const totalPages = parseInt(
            paginationItems[paginationItems.length - 1].href.split("=")[1]
        );

        let urls = [];
        let i = 2;
        while (i <= totalPages) {
            urls.push(`${url}?page=${i}`);
            i++;
        }

        return urls;

        // return [...dom.querySelectorAll("div.b-pager-pages select option")]
        //     .map((o) => o.textContent)
        //     .filter((t) => t !== "1")
        //     .map((a) => `${url}?page=${a}`);
    }

    static fetchAdditionalPageContent(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return LiteroticaParser.contentForPage(xhr.responseXML);
        });
    }

    static assembleChapter(dom, fragments) {
        let content = LiteroticaParser.contentForPage(dom);
        for (let f of fragments.filter((f) => f !== null)) {
            while (0 < f.children.length) {
                content.appendChild(f.children[0]);
            }
        }
        return dom;
    }
}
