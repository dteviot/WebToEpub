/*
  Parser for https://www.literotica.com
*/
"use strict";

parserFactory.register("literotica.com", () => new LiteroticaParser());

class LiteroticaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        const section = dom.baseURI.split("//")[1].split("/")[1];

        return this.getChapterUrlsFromMultipleTocPages(
            dom,
            this.chaptersFromMemberPage,
            section === "top"
                ? this.getUrlOfTopTocPages
                : this.getUrlOfCategoryTocPages,
            chapterUrlsUI
        );
    }

    getUrlOfTopTocPages(dom) {
        const link = dom.querySelector("span.pwrpr a:last-child ");
        let urls = [];
        if (link != null) {
            const limit = parseInt(link.text);
            for (let i = 1; i <= limit; i++) {
                urls.push(LiteroticaParser.buildTopUrl(link, i));
            }
        }
        return urls;
    }
    getUrlOfCategoryTocPages(dom) {
        const link = dom.querySelector("div.b-alpha-links li:last-child a");

        let urls = [];
        if (link != null) {
            const limit = parseInt(link.href.split("/").pop());

            for (let i = 1; i <= limit; i++) {
                urls.push(LiteroticaParser.buildCategoryUrl(link, i));
            }
        }

        return urls;
    }

    static buildTopUrl(link, i) {
        link.search = `?page=${i}`;
        return link.href;
    }
    static buildCategoryUrl(link, i) {
        const pathname = link.pathname.split("/").slice(0, -1);
        link.pathname = pathname.join("/") + `/${i}-page`;
        return link.href;
    }

    chaptersFromMemberPage(dom) {
        const section = dom.baseURI.split("//")[1].split("/")[1];

        if (section === "series") {
            let links = [...dom.querySelectorAll("ul.series__works li a.br_rj")];
            return links.map((a) => util.hyperLinkToChapter(a));
        } else if (section === "s") {
            let content = dom.querySelector("div.aa_ht");
            return content === null ? [] : util.hyperlinksToChapterList(content);
        } else if (section === "stories") {
            let links = [...dom.querySelectorAll("td.fc a, div.b-story-list-box h3 a, div.b-story-list h3 a")];
            if (0 < links.length) {
                return links.map((a) => util.hyperLinkToChapter(a));
            }
            let content = dom.querySelector("div.b-story-list");
            return content === null ? [] : util.hyperlinksToChapterList(content);
        } 
        else {
            let links = [...dom.querySelectorAll("td.mcol a:first-child")];
            if (0 < links.length) {
                return links.map((a) => util.hyperLinkToChapter(a));
            }
            let content = dom.querySelector("div.b-story-list");
            return content === null ? [] : util.hyperlinksToChapterList(content);
        }
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.headline");
    }

    extractAuthor(dom) {

        let authorLabel = dom.querySelector("div.y_eS a")?.text;
        return authorLabel || "Various Authors";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#tabpanel-info");
    }

    findContent(dom) {
        return LiteroticaParser.contentForPage(dom);
    }

    static contentForPage(dom) {
        return dom.querySelector("div.aa_ht")
            || dom.querySelector("body div");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.headline");
    }

    fetchChapter(url) {
        let dom = null;
        return HttpClient.wrapFetch(url).then(function(xhr) {
            dom = xhr.responseXML;
            let pageUrls = LiteroticaParser.findUrlsOfAdditionalPagesMakingChapter(url, dom);
            return Promise.all(pageUrls.map(LiteroticaParser.fetchAdditionalPageContent));
        }).then(function(fragments) {
            return LiteroticaParser.assembleChapter(dom, fragments);
        });
    }

    static findUrlsOfAdditionalPagesMakingChapter(url, dom) {
        let pageIds = [...dom.querySelectorAll("div.l_bH a.l_bJ")]
            .map(o => parseInt(o.href.split("=")[1]))
            .filter(t => t !== 1);
        let urls = [];
        const totalPages = (0 < pageIds.length) ? pageIds.pop() : 0;
        for (let i = 2; i <= totalPages; ++i) {
            urls.push(`${url}?page=${i}`);
        }
        return urls;
    }

    static fetchAdditionalPageContent(url) {
        return HttpClient.wrapFetch(url).then(function(xhr) {
            return LiteroticaParser.contentForPage(xhr.responseXML);
        });
    }

    static assembleChapter(dom, fragments) {
        let content = LiteroticaParser.contentForPage(dom);
        for (let f of fragments.filter(f => f !== null)) {
            while (0 < f.children.length) {
                content.appendChild(f.children[0]);
            }
        }
        return dom;
    }
}
