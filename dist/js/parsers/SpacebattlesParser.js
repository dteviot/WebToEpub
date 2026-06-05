"use strict";

parserFactory.register("forums.spacebattles.com", () => new SpacebattlesParser());
//dead url
parserFactory.register("forums.sufficientvelocity.com", () => new SpacebattlesParser());
parserFactory.register("alternatehistory.com", () => new SpacebattlesParser());
//dead url
parserFactory.register("forum.questionablequesting.com", () => new SpacebattlesParser());
parserFactory.register("questionablequesting.com", () => new SpacebattlesParser());

class SpacebattlesParser extends Parser {
    constructor() {
        super();
        this.cache = new FetchCache();
        this.minimumThrottle = 50; //182 at 20
        this.expectedChapterUrl = null;
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.structItem--threadmark a")]
            .filter(this.isLinkToChapter);
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
        return dom.querySelector("h1.p-title-value");
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
        let id = newUrl.hash.substring(1) || newUrl.href.substring(newUrl.href.lastIndexOf("/") + 1);
        let parent = fetchedDom.querySelector(`article.hasThreadmark[data-content='${id}']`);
        if (parent === null)
        {
            parent = fetchedDom.querySelector("#" + id)?.parentElement;
        }
        return parent;
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
