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
        let section = dom.baseURI.split("//")[1].split("/")[1];
        let isChapterpage = (section=="s");
        let isOneChapter = false;
        if (isChapterpage) {
            let serieslink = [...dom.querySelectorAll("a")].filter(a => a.href.includes("https://www.literotica.com/series/se/"));
            if (serieslink.length > 0) {
                dom = (await HttpClient.wrapFetch(serieslink[0].href)).responseXML;
                section = dom.baseURI.split("//")[1].split("/")[1];
            } else {
                isOneChapter = true;
            }
        }
        if (isOneChapter) {
            let chapterURL = new URL(dom.baseURI);
            return [{ 
                sourceUrl: chapterURL.origin + chapterURL.pathname,
                title: this.findChapterTitle(dom)?.textContent
            }];
        } else {
            return this.getChapterUrlsFromMultipleTocPages(
                dom,
                this.chaptersFromMemberPage,
                section === "top"
                    ? this.getUrlOfTopTocPages
                    : this.getUrlOfCategoryTocPages,
                chapterUrlsUI
            );
        }
    }

    async loadEpubMetaInfo(dom) {
        let section = dom.baseURI.split("//")[1].split("/")[1];
        let isChapterpage = (section=="s");
        if (!isChapterpage) {
            let randomChapter = [...dom.querySelectorAll("a")].filter(a => a.href.includes("https://www.literotica.com/s/"));
            if (randomChapter.length > 0) {
                dom = (await HttpClient.wrapFetch(randomChapter[0].href)).responseXML;
            }
        }
        this.title = dom.querySelector("div[data-tab=\"tabpanel-series\"] a")?.textContent??dom.querySelector("h1");
        this.author = [...dom.querySelectorAll("a")].filter(a => a.href.includes("https://www.literotica.com/authors/"))?.[0].title??"";
        this.description = [...dom.querySelectorAll("div[data-tab=\"tabpanel-info\"] div")]?.[1]?.textContent??"";
        this.tags = [...dom.querySelectorAll("div[data-tab=\"tabpanel-tags\"] a")]?.map(a => a.textContent)??[];
        return;
    }
    
    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractSubject() {
        let tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return "";
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

    findContent(dom) {
        let ret = dom.querySelector("div[itemprop=\"articleBody\"]")
            || dom.querySelector("body div");
        ret.firstChild.style.removeProperty("max-height");
        if (ret.lastChild.innerText == "Report") {
            ret.lastChild.remove();
        }
        return ret;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    moreChapterTextUrl(dom, url, count) {
        let prevnode = dom.querySelector("span[title=\"Previous Page\"]")??dom.querySelector("a[title=\"Previous Page\"]");
        let prevparentnode = prevnode?.parentNode;
        let pageIds = prevparentnode?[...prevparentnode.querySelectorAll("a")]
            .map(o => parseInt(o.href.split("=")[1]))
            .filter(t => t !== 1):[];
        const totalPages = (0 < pageIds.length) ? pageIds.pop() : 0;
        if (count <= totalPages) {
            return url + "?page=" + count;
        }
        return null;
    }
}
