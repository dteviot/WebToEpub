"use strict";

parserFactory.register("novel543.com", () => new Novel543Parser());
parserFactory.register("twbook.cc", () => new Novel543Parser());

class Novel543Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = new URL(dom.baseURI);
        let [bookId] = tocUrl.pathname.split("/").filter(Boolean);
        tocUrl.pathname = `/${bookId}/dir`;
        tocUrl.hash = "";
        tocUrl.search = "";
        let nextDom = (await HttpClient.wrapFetch(tocUrl.href)).responseXML;
        let menu = nextDom.querySelector("div.chaplist ul:nth-of-type(2)");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("div.chapter-content h1") ?? dom.querySelector("h1.title");
        if (title !== null && title.textContent !== null) {
            // strip the page part marker of split chapters, e.g. "第1章 xxx (1/2)"
            title.textContent = title.textContent.replace(/\s*\(\d+\/\d+\)\s*$/, "");
        }
        return title;
    }

    /**
     * Clean junk out of each fetched chapter page before content extraction and
     * image collection, so promo banners are not packed as images.
     * @param { Document } dom
     */
    preprocessRawDom(dom) {
        this.removeNovel543Junk(dom);
    }

    customRawDomToContentStep(chapter, content) {
        if (content === null) {
            return;
        }
        // split chapters show a title on every part page,
        // e.g. "第1章 xxx (1/2)", "第1章 xxx (2/2)": keep only the first one
        let headings = [...content.querySelectorAll("h1")];
        let isPagePartTitle = (heading) => /\(\d+\/\d+\)\s*$/.test(heading.textContent ?? "");
        util.removeElements(headings.slice(1).filter(isPagePartTitle));
        for (let heading of content.querySelectorAll("h1")) {
            heading.textContent = heading.textContent.replace(/\s*\(\d+\/\d+\)\s*$/, "");
        }
        this.removeNovel543Junk(content);
    }

    /**
     * Remove ad slots, the "溫馨提示" site notice text, and the VIP membership
     * promo banner. Runs on the whole document pre-collection and again on the
     * extracted content when packing (idempotent).
     * @param { Element | Document } root
     */
    removeNovel543Junk(root) {
        util.removeElements(root.querySelectorAll("div.adBlock, div.gadBlock"));
        for (let tip of root.querySelectorAll("p span[style*='ff6666']")) {
            tip.closest("p")?.remove();
        }
        for (let img of root.querySelectorAll("img[src*='vip.png']")) {
            img.closest("div")?.remove();
        }
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return dom.querySelector("p.meta a[href*='bookstack']")?.textContent?.trim();
    }

    extractLanguage() {
        return "zh";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    async fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    /**
     * @param { Document } dom 
     * @param { string } baseUrl 
     * @private
     */
    moreChapterTextUrl(dom, baseUrl) {
        /**
         * Extract chapter base from original URL (e.g., "8096_1" from "8096_1.html" or "8096_1_2.html")
         * 
         * @param { string  } url 
         */
        let getChapterBase = (url) => {
            let match = url.match(/\/(\d+_\d+)(?:_\d+)?\.html/);
            return match ? match[1] : null;
        };
        
        let baseChapter = getChapterBase(baseUrl);
        if (!baseChapter) return null;
        
        // Find the last link in foot-nav (next chapter link)
        let nextLink = /** @type { HTMLAnchorElement | undefined } */ ([...dom.querySelectorAll(".foot-nav a")].pop());
        if (!nextLink) return null;
        
        let nextUrl = nextLink.href;
        // Check if the next URL is a continuation of the same chapter
        // (e.g., 8096_1_2.html is a continuation of 8096_1.html)
        if (nextUrl.includes(`/${baseChapter}_`)) {
            return nextUrl;
        }
        return null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.intro")];
    }
}
