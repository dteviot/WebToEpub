"use strict";
parserFactory.registerManualSelect(
    "Xenforo Batch Post Parser",
    () => new XenforoBatchParser()
);

class XenforoBatchParser extends Parser {
    constructor() {
        super();
        this.cache = new FetchCache();
        this.subParser = null;
    }

    getSubParser(dom)
    {
        if (!this.subParser)
        {
            this.subParser = parserFactory.fetchByUrl(dom.baseURI);
            this.minimumThrottle = this.subParser.minimumThrottle;
        }
        return this.subParser;
    }
    
    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    async getChapterUrls(dom) {
        let pagingUriComponent = "page-";
        let baseURI = null;
        let pageCount = 1;
        {
            let lastPage = dom.querySelector("div.pageNav li:last-child a");
            baseURI = lastPage.baseURI;
            let pageRegexResult = /\d+\/?$/.exec(lastPage.href);
            if (pageRegexResult)
            {
                pageCount = parseInt(pageRegexResult[0]);
            }
            pagingUriComponent = new RegExp(baseURI+"(.*?)\\d+/?$").exec(lastPage.href)[1] ?? pagingUriComponent;
        }
        return [...Array(pageCount).keys()].map(index => ({ 
            sourceUrl: `${baseURI}${pagingUriComponent}${index}`,
            title: `Page ${index + 1}`
        }));
    }
    
    async fetchChapter(url) {
        let fetchedDom = await this.cache.fetch(url);
        let newDoc = Parser.makeEmptyDocForContent(url);
        [... fetchedDom.querySelectorAll("article.message")].forEach(parent => {
            let author = parent.dataset["author"];
            let postIdElement = parent.querySelector("header.message-attribution ul.message-attribution-opposite li:last-child a");
            let title = "";
            
            let chapterBody = parent.querySelector("article.message-body");
            let titleElement = parent.querySelector("span.threadmarkLabel");
            if (titleElement)
            {
                title = titleElement.textContent.trim();
            }
            else
            {
                title = postIdElement.textContent;
                let possibleTitle = chapterBody.querySelector("div.bbWrapper").firstChild.textContent;
                if (possibleTitle.length < 100) //prevent overly-long titles
                {
                    title = `${title}: ${possibleTitle}`;
                }
            }
            title = `${title} — ${author}`;
            titleElement = newDoc.dom.createElement("h1");
            titleElement.textContent = title;
            newDoc.content.appendChild(titleElement);
            util.resolveLazyLoadedImages(chapterBody, "img.lazyload");
            newDoc.content.appendChild(chapterBody);
        });
        return newDoc.dom;
    }

    isLinkToChapter(link) {
        return this.subParser.isLinkToChapter(link);
    }

    findContent(dom) {
        return this.getSubParser(dom).findContent(dom);
    }

    extractTitleImpl(dom) {
        return this.getSubParser(dom).extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        return this.getSubParser(dom).extractAuthor(dom);
    }

    //addTitleToChapter(newDoc, parent) {}

    getInformationEpubItemChildNodes(dom) {
        return this.getSubParser(dom).getInformationEpubItemChildNodes(dom);
    }
}
