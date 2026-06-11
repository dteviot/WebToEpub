"use strict";

parserFactory.register("wxscs.com", () => new WxscsParser());

class WxscsParser extends Parser {
    constructor() {
        super();
        this.state.indexDom = null;
        this.state.indexUrl = null;
    }

    async onLoadFirstPage(url, firstPageDom) {
        // If we're on a chapter page, fetch and cache the index page
        if (!firstPageDom.querySelector("div#all-chapter")) {
            let bookId = this.extractBookId(firstPageDom);
            if (bookId) {
                this.state.indexUrl = `https://www.wxscs.com/book/${bookId}/`;
                this.state.indexDom = (await HttpClient.wrapFetch(this.state.indexUrl)).responseXML;
                // Update firstPageDom to be the index page
                firstPageDom = this.state.indexDom;
                url = this.state.indexUrl;
            }
        } else {
            // We're already on the index page
            this.state.indexDom = firstPageDom;
            this.state.indexUrl = url;
        }

        this.state.firstPageDom = firstPageDom;
        this.state.chapterListUrl = url;
        
        super.onLoadFirstPage(url, firstPageDom);
    }

    async getChapterUrls(dom) {
        // Extract urls from the chapter list div if it exists
        let chapterList = dom.querySelector("div#all-chapter");
        if (!chapterList && this.state.indexDom) {
            // We're on a chapter page and have cached index, use its chapter list
            chapterList = this.state.indexDom.querySelector("div#all-chapter");
        }
        
        if (chapterList) {
            return [...chapterList.querySelectorAll(".panel-body a")]
                .map(a => util.hyperLinkToChapter(a));
        }
        return [];
    }

    // Get the actual content by handling pagination
    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let extraPages = this.getExtraPageUrls(dom);
        return this.fetchAndAddExtraContent(dom, extraPages);
    }

    // Extract urls of additional pages from the pagination div
    getExtraPageUrls(dom) {
        let urls = [];
        let pagination = dom.querySelector("div.page");
        if (pagination) {
            let pages = [...pagination.querySelectorAll("ul.pagination li a")]
                .map(a => a.href)
                .filter(h => h); // Filter out any null/empty urls
            urls.push(...pages);
        }
        return urls;
    }

    // Fetch additional pages and combine content
    async fetchAndAddExtraContent(dom, extraPages) {
        let mainContent = this.findContent(dom);
        
        for (let pageUrl of extraPages) {
            try {
                let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;
                let pageContent = this.findContent(pageDom);
                if (pageContent) {
                    // Append the content from additional pages
                    mainContent.appendChild(pageContent);
                }
            } catch (error) {
                ErrorLog.log(`Failed to fetch page ${pageUrl}: ${error}`);
            }
        }
        return dom;
    }

    findContent(dom) {
        return dom.querySelector("div#cont-body");
    }

    extractBookId(dom) {
        // Try to get book ID from script tag
        let scripts = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes("book.id="));
            
        if (scripts.length > 0) {
            let match = scripts[0].match(/book\.id="(\d+)"/);
            if (match) {
                return match[1];
            }
        }
        
        // Fallback: try to get from URL
        let url = new URL(dom.baseURI);
        let parts = url.pathname.split("/");
        if (parts.length >= 3 && parts[1] === "book") {
            return parts[2];
        }
        
        return null;
    }

    // Get chapter title from h1 element
    findChapterTitle(dom) {
        return dom.querySelector("h1.cont-title");
    }

    // Get novel title 
    extractTitleImpl(dom) {
        // Use index page title if available
        if (this.state.indexDom) {
            let indexTitle = this.state.indexDom.querySelector("h1.book-name");
            if (indexTitle) {
                return indexTitle;
            }
        }
        return dom.querySelector("h1.book-name");
    }

    findCoverImageUrl(dom) {
        // Use index page cover if available
        if (this.state.indexDom) {
            let coverImg = this.state.indexDom.querySelector(".book-img-middel");
            if (coverImg?.src) {
                return coverImg.src;
            }
        }
        let coverImg = dom.querySelector(".book-img-middel");
        if (coverImg?.src) {
            return coverImg.src;
        }
    }

    getInformationEpubItemChildNodes() {
        if (this.state.indexDom) {
            // Get book description
            let description = this.state.indexDom.querySelector("div.book-detail");
            if (description) {
                let descriptionClone = description.cloneNode(true);
                // Cleanup description
                this.removeUnwantedElementsFromContentElement(descriptionClone);
                return [descriptionClone];
            }
        }
        return [];
    }

    // Get author (optional)
    extractAuthor(dom) {
        // Try book info div (for index page)
        let authorLink = dom.querySelector("div.book-info a[href*='author']");
        if (authorLink?.textContent) {
            return authorLink.textContent;
        }

        // Try meta tag
        let metaAuthor = dom.querySelector("meta[property='og:novel:author']")?.content;
        if (metaAuthor) {
            return metaAuthor;
        }

        // Try book object in script (for chapter pages)
        let scripts = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes("book.author="));
            
        if (scripts.length > 0) {
            let match = scripts[0].match(/book\.author="([^"]+)"/);
            if (match) {
                return match[1];
            }
        }

        return super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        // Remove any ads or unwanted elements here
        util.removeChildElementsMatchingSelector(element, "script");
        super.removeUnwantedElementsFromContentElement(element);
    }
}