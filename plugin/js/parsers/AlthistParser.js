"use strict";

parserFactory.register("althistory.com", () => new AlthistoryParser());

class AlthistoryParser extends Parser {
    constructor() {
        super();
        this.cache = new FetchCache();
        this.minimumThrottle = 50; //182 at 20
        this.expectedChapterUrl = null;
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll(".threadmark_depth0 > ul > li > a")];
        // .filter(this.isLinkToChapter);
        return chapters.map(a => util.hyperLinkToChapter(a));
    }

    isLinkToChapter(link) {
        return !link.querySelector("date")
            && !(new URL(link.href).pathname.startsWith("/awards/award"));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".threadmarkLabel");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.username");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    async fetchChapter(url) {
        let article = await this.fetchArticle(url);
        if (!article && this.expectedChapterUrl && (this.expectedChapterUrl != url)) {
            article = await this.fetchArticle(this.expectedChapterUrl);
        }
        if (article == null) {
            throw new Error(`Can not find chapter ${url}`);
        }
        this.expectedChapterUrl = this.findExpectedNextChapter(article);

        let newDoc = Parser.makeEmptyDocForContent(url);
        this.addTitleToChapter(newDoc, article);
        let content = article.querySelector("article.message-body");
        util.resolveLazyLoadedImages(content, "img.lazyload");
        newDoc.content.appendChild(content);
        return newDoc.dom;
    }

    async fetchArticle(url) {
        let fetchedDom = await this.cache.fetch(url);
        let newUrl = new URL(url);
        let id = newUrl.hash.substring(1);
        let parent = fetchedDom.querySelector(`article.message[data-content='${id}']`);
        if (parent === null)
        {
            parent = fetchedDom.querySelector("#" + id)?.parentElement;
        }
        return parent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".threadmarkListingHeader-icon");
    }

    findExpectedNextChapter(article) {
        return article.querySelector("li.threadmark-nav")
            ?.querySelector("a:nth-of-type(3)")
            ?.href;
    }

    addTitleToChapter(newDoc, parent) {
        let titleElement = parent.querySelector("span.threadmarkLabel");
        if (titleElement !== null)
        {
            let title = newDoc.dom.createElement("h1");
            title.textContent = titleElement.textContent.trim();
            newDoc.content.appendChild(title);
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article.threadmarkListingHeader-extraInfoChild")];
    }
}
