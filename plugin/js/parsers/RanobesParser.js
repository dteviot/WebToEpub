"use strict";

parserFactory.register("ranobes.net", () => new RanobesNetParser());
parserFactory.register("ranobes.top", () => new RanobesParser());
parserFactory.register("ranobes.com", () => new RanobesParser());

class RanobesParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let tocUrl = dom.querySelector("div.r-fullstory-chapters-foot a[title='Go to table of contents']")?.href;
        if (tocUrl == null) {
            tocUrl = dom.querySelector("div.r-fullstory-chapters-foot a[title='Перейти в оглавление']")?.href;
        }
        if (tocUrl == null) {
            return [...dom.querySelectorAll("ul.chapters-scroll-list a")]
                .map(a => ({
                    sourceUrl:  a.href,
                    title: a.querySelector(".title").textContent
                })).reverse();
        }
        let options = {
            parser: this
        };
        let tocDom = (await HttpClient.wrapFetch(tocUrl, options)).responseXML;
        let urlsOfTocPages = RanobesParser.extractTocPageUrls(tocDom, tocUrl);
        return (await this.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI, options)).reverse();
    }

    static extractTocPageUrls(dom, baseUrl) {
        let max = RanobesParser.extractTocJson(dom)?.pages_count ?? 0;
        let tocUrls = [];
        for (let i = 1; i <= max; ++i) {
            tocUrls.push(`${baseUrl}page/${i}/`);
        }
        return tocUrls;
    }

    static extractTocJson(dom) {
        let baseURL = new URL(dom.baseURI).hostname;
        if (baseURL != "ranobes.com") {
            let startString = "window.__DATA__ = ";
            let scriptElement = [...dom.querySelectorAll("script")]
                .filter(s => s.textContent.includes(startString))[0];
            return (scriptElement != null)
                ? util.locateAndExtractJson(scriptElement.textContent, startString)
                : {chapters: [], pages_count: 0};
        } else {
            let linkElement = Math.max(...[...dom.querySelectorAll(".pages a")].map(a => parseInt(a.textContent)));
            return (Infinity == linkElement || -Infinity == linkElement)?
                {chapters: [], pages_count: 0} 
                : {chapters: [], pages_count: linkElement};
        }   
    }

    extractPartialChapterList(dom) {
        let baseURL = new URL(dom.baseURI).hostname;
        if (baseURL != "ranobes.com") {
            return RanobesParser.extractTocJson(dom).chapters.map(c => ({
                sourceUrl:  c.link,
                title: c.title
            }));
        } else {
            let Chapterlist = dom.querySelector("#dle-content");
            let RemoveNavigation = Chapterlist.querySelector(".navigation");
            Chapterlist.removeChild(RemoveNavigation);
            return util.hyperlinksToChapterList(Chapterlist);
        }
    }

    findContent(dom) {
        return dom.querySelector("div#arrticle");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("h1.title");
        util.removeChildElementsMatchingSelector(title, "span.subtitle, span[hidden]");
        return title;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span[itemprop='creator'] a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("h1.title");
        util.removeChildElementsMatchingSelector(title, "span, div");
        return title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.r-fullstory-poster");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.moreless__full")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "a");
        return node;
    }    
}

class RanobesNetParser extends RanobesParser {
    constructor() {
        super();
        this.minimumThrottle = 8000;
    }

    async fetchChapter(url) {
        let options = {
            parser: this
        };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }
    
    isCustomError(response) {
        if (response.responseXML.title == "Just a moment...") {
            return true;
        }
        return false;
    }

    setCustomErrorResponse(url, wrapOptions) {
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {};
        newresp.response.url = url;
        newresp.response.status = 403;
        return newresp;
    }
}