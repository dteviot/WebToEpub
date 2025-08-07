"use strict";

parserFactory.register("allnovel.org", () => new NovelfullParser());
parserFactory.register("allnovelbin.net", () => new NovelfullParser());
parserFactory.register("allnovelfull.app", () => new NovelfullParser());
parserFactory.register("allnovelfull.com", () => new NovelfullParser());
//dead url
parserFactory.register("allnovelfull.org", () => new NovelfullParser());
parserFactory.register("allnovelfull.net", () => new NovelfullParser());
parserFactory.register("allnovelnext.com", () => new NovelfullParser());
parserFactory.register("all-novelfull.net", () => new NovelfullParser());
parserFactory.register("boxnovelfull.com", () => new NovelfullParser());
//dead url
parserFactory.register("freenovelsread.com", () => new NovelfullParser());
parserFactory.register("freewn.com", () => new NovelfullParser());
parserFactory.register("novel-bin.com", () => new NovelHyphenBinParser());
parserFactory.register("novel-bin.net", () => new NovelHyphenBinParser());
parserFactory.register("novel-bin.org", () => new NovelHyphenBinParser());
parserFactory.register("novel-next.com", () => new NovelfullParser());
parserFactory.register("novel35.com", () => new Novel35Parser());
parserFactory.register("novelactive.org", () => new NovelfullParser());
parserFactory.register("novelbin.com", () => new NovelbinParser());
parserFactory.register("novelbin.me", () => new NovelfullParser());
parserFactory.register("novelbin.net", () => new NovelfullParser());
parserFactory.register("novelbin.org", () => new NovelfullParser());
//dead url
parserFactory.register("novelebook.net", () => new NovelfullParser());
parserFactory.register("novelfull.com", () => new NovelfullParser());
parserFactory.register("novelfull.net", () => new NovelfullParser());
parserFactory.register("novelfullbook.com", () => new NovelfullParser());
parserFactory.register("novelfulll.com", () => new NovelfullParser());
//dead url
parserFactory.register("novelhulk.net", () => new NovelfullParser());
parserFactory.register("novelmax.net", () => new NovelfullParser());
parserFactory.register("novelnext.com", () => new NovelfullParser());
parserFactory.register("novelnext.dramanovels.io", () => new NovelfullParser());
parserFactory.register("novelnext.net", () => new NovelfullParser());
parserFactory.register("novelnextz.com", () => new NovelfullParser());
//dead url
parserFactory.register("noveltop1.org", () => new NovelfullParser());
parserFactory.register("noveltrust.net", () => new NovelfullParser());
parserFactory.register("novelusb.com", () => new NovelfullParser());
parserFactory.register("novelusb.net", () => new NovelfullParser());
parserFactory.register("novelxo.net", () => new NovelfullParser());
parserFactory.register("readnovelfull.me", () => new NovelfullParser());
//dead url
parserFactory.register("thenovelbin.org", () => new NovelfullParser());
parserFactory.register("topnovelfull.com", () => new NovelfullParser());
parserFactory.register("zinnovel.net", () => new NovelfullParser());

parserFactory.registerManualSelect("NovelNext", () => new NovelfullParser());

class NovelfullParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    // This site uses lots of hostname aliases in the chapter URLs
    // and changes them frequently.  Resulting in WtE not picking the
    // correct parser for the chapters
    // See: https://github.com/dteviot/WebToEpub/issues/1345
    async addParsersToPages(pagesToFetch) {
        for (let page of pagesToFetch) {
            page.parser = this;
        }
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    getUrlsOfTocPages(dom) {
        let link = dom.querySelector("li.last a");
        let urls = [];
        if (link != null) {
            let limit = link.getAttribute("data-page");
            if (limit == null)
            {
                let url = new URL(link.href);
                limit = url.searchParams.get("page_num") || null;
            }
            limit = parseInt(limit || "-1") + 1;
            for (let i = 1; i <= limit; ++i) {
                urls.push(NovelfullParser.buildUrlForTocPage(link, i));
            }
        }
        return urls;
    }

    static buildUrlForTocPage(link, i) {
        let hostname = link.hostname;
        if (hostname === "freenovelsread.com")
        {
            link.pathname = link.pathname.split("/")[1] + "/" + i;
        } else if (hostname === "novelfulll.com") {
            link.search = `?page_num=${i}`;
        } else {
            link.search = `?page=${i}&per-page=50`;
        }
        return link.href;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.list-chapter a")]
            .map(link => util.hyperLinkToChapter(link));
    }

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.querySelector("#chr-content")
            || dom.querySelector("#chapter-content");
    }

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    extractAuthor(dom) {
        let items = [...dom.querySelectorAll("ul.info-meta li")]
            .filter(u => u.querySelector("h3")?.textContent === "Author:")
            .map(u => u.querySelector("a")?.textContent);
        return 0 < items.length 
            ? items[0]
            : super.extractAuthor(dom);
    }

    preprocessRawDom(dom) {
        this.tagWatermark(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text, div.info")];
    }

    tagWatermark(dom) {
        const watermark = this.findWatermark(dom);
        if (watermark) {
            let paragraphs = [...dom.querySelectorAll("p")]
                .filter(p => p.textContent.includes(watermark));
            for (let p of paragraphs) {
                p.textContent = p.textContent.replace(watermark, "");
                p.appendChild(this.makeSpanWithWatermark(dom, watermark));
            }
        }
    }

    findWatermark(dom) {
        const searchToken = "original11Content.replace(\"";
        const script = [...dom.querySelectorAll("script")]
            .filter(s => s.innerHTML.includes(searchToken))
            .map(s => s.innerHTML)[0];
        if (!script) {
            return null;
        }
        const line = script.substring(script.indexOf(searchToken) + searchToken.length);
        return line.substring(0, line.indexOf("\""));
    }

    makeSpanWithWatermark(dom, watermark) {
        let span = dom.createElement("span");
        span.textContent = watermark;
        span.id = "span";
        span.hidden = true;
        return span;
    }
}

class Novel35Parser extends NovelfullParser {
    constructor() {
        super();
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a:not([rel])")];
        if (0 < paginateUrls.length) {
            let url = new URL(paginateUrls.pop().href);
            let maxPage = url.searchParams.get("page");
            for (let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-title").textContent;
    }    
}

class NovelHyphenBinParser extends NovelfullParser {
    constructor() {
        super();
    }

    removeUnwantedElementsFromContentElement(element) {
        let marks = [...element.querySelectorAll(".novel_online, .unlock-buttons")];
        for (let mark of marks) {
            mark.nextSibling.nextSibling.remove();
            mark.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

class NovelbinParser extends NovelfullParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let url = new URL(dom.baseURI);
        let slug = url.pathname.split("/").filter(a => a != "");
        slug = slug[slug.length-1];
        let tocHtml = (await HttpClient.wrapFetch("https://novelbin.com/ajax/chapter-archive?novelId="+slug)).responseXML;
        let chapters = this.extractPartialChapterList(tocHtml);
        return chapters;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".unlock-buttons");
        super.removeUnwantedElementsFromContentElement(element);
    }
}