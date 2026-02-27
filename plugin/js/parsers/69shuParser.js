"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).includes("69shu")),
    () => new ShuParser()
);
parserFactory.register("69shuba.tw", () => new _69shuTwParser());
parserFactory.registerDeadSite("69yuedu.net", () => new _69yueduParser());

class ShuParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.more-btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#catalog ul");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.txtnav");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.booknav2 h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookbox");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelectorAll(".booknav2 a")[1];
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".txtinfo, #txtright, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".booknav2 > p:nth-child(3) a")];

        let tagHeader = dom.querySelector(".tagtitle");
        if (tagHeader?.textContent == "标签") { 
            let tags = [...dom.querySelectorAll("#tagul a")];
            return [...genres, ...tags].map(e => e.textContent).join(", ");
        }

        return genres.map(e => e.textContent).join(", ");
    }

    extractDescription(dom) { // We only take the first p element that holds the description, the second one holds the story keywords.
        return dom.querySelector(".navtxt > p:nth-child(1)").textContent.trim(); 
    }

    async fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }
}

class _69yueduParser extends ShuParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#chapters ul");
        return util.hyperlinksToChapterList(menu);
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }
}

class _69shuTwParser extends ShuParser {

    async getChapterUrls(dom) {
        let base = "https://69shuba.tw";
        
        let tocUrl = dom.querySelector(".book-op > tbody tr td:nth-child(2) a").href;

        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let pageUrls = [...tocDom.querySelectorAll("#indexselect-top option")]
            .map(o => new URL(o.value, base).href);

        let chapters = [];

        for (let pageUrl of pageUrls) {
            let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;

            let nodes = [...pageDom.querySelectorAll(".last9 li:not(.title) :is(a, span.protected-chapter-link)")];

            let links = nodes.map(el => {
                if (el.tagName === "A") return el;

                let a = pageDom.createElement("a");
                a.href = new URL(el.dataset.cidUrl, base).href;
                a.textContent = el.textContent.trim();
                return a;
            });

            chapters.push(...links.map(a => util.hyperLinkToChapter(a)));
        }

        return chapters;
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url)).responseXML;
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info p:nth-child(2) a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".book-tags a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".intro p").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector("#nr_title");
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookinfo");
    }
}
