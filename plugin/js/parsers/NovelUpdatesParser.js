/*
  Template to use to create a new parser
*/
"use strict";

parserFactory.register("novelupdates.com", () => new NovelUpdatesParser());

class NovelUpdatesParser extends Parser {
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    async getChapterUrls(dom) {
        let links = await NovelUpdatesParser.fetchChapterUrls(dom);
        let chapters = links.map(l => util.hyperLinkToChapter(l));
        return chapters.reverse();
    }

    static async fetchChapterUrls(dom) {
        let extraPagesWithToc = NovelUpdatesParser.findPagesWithToC(dom);
        let chapterLists = await Promise.all(
            extraPagesWithToc.map(url => NovelUpdatesParser.fetchChapterListFromPage(url))
        );
        return chapterLists.reduce(function(prev, current) {
            return prev.concat(current);
        }, NovelUpdatesParser.chapterLinksFromDom(dom));
    }

    static async fetchChapterListFromPage(url) {
        let xhr = await HttpClient.wrapFetch(url);
        return NovelUpdatesParser.chapterLinksFromDom(xhr.responseXML);
    }

    static chapterLinksFromDom(dom) {
        return [...dom.querySelectorAll("table#myTable tbody tr")]
            .map(NovelUpdatesParser.chapterLinksFromRow)
            .filter(l => l !== null);
    }

    static chapterLinksFromRow(row) {
        let links = [...row.querySelectorAll("a")];
        return (0 < links.length) ? links[links.length - 1] : null;
    }
    
    static findPagesWithToC(dom) {
        let urls = [];
        let div = dom.querySelector("div.digg_pagination");
        if (div !== null) {
            let maxPage = NovelUpdatesParser.getPageValueOfLastTocPage(div);
            for (let i = 2; i <= maxPage; ++i) {
                urls.push(dom.baseURI + "?pg=" + i);
            }
        }
        return urls;
    }

    static getPageValueOfLastTocPage(div) {
        return [...div.querySelectorAll("a")].reduce(function(prev, curr) {
            let t = NovelUpdatesParser.getPageSearchParameter(curr);
            return (t > prev) ? t : prev;
        }, -1);
    }

    static getPageSearchParameter(link) {
        let query = link.search;
        if (query.startsWith("?pg=")) {
            return parseInt(query.substring(4));
        }
    } 

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.body;
    }

    // title of the story
    extractTitleImpl(dom) {
        return dom.querySelector("div.seriestitlenu");
    }

    // author of the story
    extractAuthor(dom) {
        let author = dom.querySelector("div#showauthors a");
        return (author !== null) ? author.textContent : super.extractAuthor(dom);
    }
}
