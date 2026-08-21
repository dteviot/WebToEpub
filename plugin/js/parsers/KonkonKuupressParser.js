"use strict";

parserFactory.register("konkon.ink", () => new KonkonKuupressParser("https://konkon.ink", "https://api-k.konkon.ink", "Konkon"));
parserFactory.register("kuupress.com", () => new KonkonKuupressParser("https://kuupress.com", "https://api-kp.kuupress.com", "Kuupress"));

class KKPFetchCache {
    constructor(siteUrl, apiUrl) {
        this.cache = {};
        this.siteUrl = siteUrl;
        this.apiUrl = apiUrl;
    }

    async fetch(url) {
        url = url.toString();
        if (this.cache[url]) return this.cache[url];
        await HttpClient.setDeclarativeNetRequestRules([
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [{
                        header: "Origin",
                        operation: "set",
                        value: this.siteUrl
                    }]
                },
                condition: {
                    requestDomains: [(new URL(this.apiUrl).hostname)],
                    resourceTypes: ["xmlhttprequest"]
                }
            }
        ]);
        let contents = (await HttpClient.fetchJson(url)).json;
        this.cache[url] = contents;
        return contents;
    }
}

class KonkonKuupressParser extends Parser {
    constructor(siteUrl, apiUrl, publisher) {
        super();
        this.siteUrl = siteUrl;
        this.apiUrl = apiUrl;
        this.publisher = publisher;
        this.fetchCache = new KKPFetchCache(siteUrl, apiUrl);
    }

    dispatchOnChapterOrNovel(url, chapterBranch, novelBranch) {
        // Make sure we're using a chapter or novel page
        let urlAsURL = new URL(url);
        if (!urlAsURL.pathname.startsWith("/read/")) {
            throw new Error("Must use either a novel page or a chapter page!");
        }
        // Logic changes from here depending on whether we have a novel or a chapter
        // Pass in the URL to the API instead (since otherwise that'd be the first thing we do)
        if (urlAsURL.pathname.startsWith("/read/chapter/")) {
            return chapterBranch(this.chapterUrlToAPI(urlAsURL));
        } else {
            return novelBranch(this.novelUrlToAPI(urlAsURL));
        }
    }

    chapterUrlToAPI(url) {
        // `<0: empty>/<1: always "read">/<2: always "chapter">/<3: the chapter id>/<4: the slug>`
        return new URL(this.apiUrl + "/api/public/chapters/" + url.pathname.split("/")[3]);
    }

    novelAPIFromSlug(slug) {
        return new URL(this.apiUrl + "/api/public/novels/" + slug);
    }

    novelUrlToAPI(url) {
        // `<0: empty>/<1: always "read">/<2: the slug>`
        return this.novelAPIFromSlug(url.pathname.split("/")[2]);
    }

    async getChapterUrls() {
        return this.dispatchOnChapterOrNovel(
            this.state.chapterListUrl,
            this.getChapterUrlsFromChapter.bind(this),
            this.getChapterUrlsFromNovel.bind(this)
        );
    }

    async getChapterUrlsFromChapter(url) {
        // Get chapter JSON object
        let data = await this.fetchCache.fetch(url);
        // Get novel slug
        let novelSlug = data.data?.novel?.slug;
        if (novelSlug === undefined) {
            throw new Error("Something changed on the site backend (no volume info in chapter)");
        }
        // Converge on novel flow
        return this.getChapterUrlsFromNovel(this.novelAPIFromSlug(novelSlug));
    }

    async getChapterUrlsFromNovel(url) {
        // Get novel JSON object
        let data = await this.fetchCache.fetch(url);
        // Store novel URL and title on parser (used in addFirstPageUrlToWebPages below)
        this.novelUrl = this.siteUrl + "/read/" + data.data?.slug;
        this.novelTitle = data.data?.title;
        // Collect chapters (will be turned into URLs later)
        let chapters = [];
        // First pass: all unlocked chapters
        let volumes = data.data?.volumes;
        if (volumes == undefined) {
            throw new Error("Something changed on the site backend (no volumes)");
        }
        for (const [volumeIndex, volume] of volumes.entries()) {
            // Set volume ID
            url.searchParams.set("volume_id", volume.id);
            // Page by 100s (highest value the site normally lets you)
            let pageNumber = 1;
            url.searchParams.set("page", pageNumber);
            url.searchParams.set("per_page", 100);
            // Get first page
            let page = await this.fetchCache.fetch(url);
            // Extract number of pages
            let pageCount = page.data?.chapters_pagination?.last_page;
            if (pageCount === undefined) {
                throw new Error("Something changed on the site backend (no page count)");
            }
            do {
                let pageChapters = page.data?.volumes[volumeIndex]?.chapters;
                if (pageChapters === undefined) {
                    // This *really* shouldn't be possible, since even the volume not being paginated has an empty list here
                    // So something big must have changed for us to get here
                    throw new Error("Something changed on the site backend (no chapters in volume)");
                }
                pageChapters.forEach((chapter) => {
                    // If the chapter is locked and we don't have access, skip it
                    // TODO: the API treats all requests not coming from "Origin: <site>" as unauthenticated meaning
                    // we can't access the chapters the user has unlocked anyways! barring them changing the way their
                    // authentication works in order to make us work, we'd need some sort of workaround
                    if (chapter.is_locked && !chapter.user_has_access) return;
                    // Store index of volume (used in final sort)
                    chapter.volume = volumeIndex;
                    chapters.push(chapter);
                });
                // Add 1 to page count
                pageNumber+=1;
                // Fetch next page if we're still continuing
                if (pageNumber<=pageCount) {
                    url.searchParams.set("page", pageNumber);
                    page = await this.fetchCache.fetch(url);
                }
            } while (pageNumber<=pageCount);
        }
        // Final pass: sort the chapters and convert them to URLs we can put in the UI
        chapters.sort((a, b) => {
            return (a.volume - b.volume) || (a.sort_order - b.sort_order);
        });
        return chapters.map((chapter) => {
            return {
                sourceUrl: (this.siteUrl + `/read/chapter/${chapter.id}/${chapter.slug}`),
                title: chapter.title
            };
        });
    }

    addFirstPageUrlToWebPages(url, firstPageDom, webPages) {
        // What this is meant to do: add Table of Contents page (if that was our first page)
        // What we're going to do instead: add the novel URL to the list of pages (which we'll catch in fetchChapter
        // and handle accordingly)
        let present = webPages.find(e => e.sourceUrl === this.novelUrl);
        if (present)
        {
            return webPages;
        } else {
            return [{
                sourceUrl: this.novelUrl,
                title: this.novelTitle
            }].concat(webPages);
        }
    }

    async fetchChapter(url) {
        return this.dispatchOnChapterOrNovel(
            url,
            this.fetchActualChapter.bind(this, url),
            this.generateTableOfContentsPage.bind(this, url)
        );
    }

    static createElementWithTextContent(dom, tagName, textContent) {
        let element = dom.createElement(tagName);
        element.textContent = textContent;
        return element;
    }

    async fetchActualChapter(baseUrl, dataUrl) {
        // Get chapter JSON object
        let data = await this.fetchCache.fetch(dataUrl);
        // Make doc for content
        let doc = Parser.makeEmptyDocForContent(baseUrl);
        // Chapter title
        doc.dom.title = data.data?.title;
        // Chapter content into doc
        doc.content.innerHTML = data.data?.content;
        return doc.dom;
    }

    async generateTableOfContentsPage(baseUrl, dataUrl) {
        // Get novel JSON object
        let data = await this.fetchCache.fetch(dataUrl);
        // Make doc for content
        let doc = Parser.makeEmptyDocForContent(baseUrl);
        // Generate table of contents based on the novel
        let createElementWithTextContent = KonkonKuupressParser.createElementWithTextContent.bind(null, doc.dom);
        // Title
        doc.dom.title = data.data?.title;
        // Description (nested in blockquote)
        let description = createElementWithTextContent("blockquote", "");
        description.innerHTML = data.data?.description;
        doc.content.appendChild(description);
        // Each volume gets a h2 header and a ul of links to chapters.
        for (const [volumeIndex, volume] of data.data.volumes.entries()) {
            // Create header and ul
            doc.content.appendChild(createElementWithTextContent("h2",volume.title));
            let chaptersUL = createElementWithTextContent("ul", "");
            // Set volume ID
            dataUrl.searchParams.set("volume_id", volume.id);
            // Page by 100s (highest value the site normally lets you)
            let pageNumber = 1;
            dataUrl.searchParams.set("page", pageNumber);
            dataUrl.searchParams.set("per_page", 100);
            // Get first page
            let page = await this.fetchCache.fetch(dataUrl);
            // Extract number of pages
            let pageCount = page.data?.chapters_pagination?.last_page;
            if (pageCount === undefined) {
                throw new Error("Something changed on the site backend (no page count)");
            }
            do {
                let pageChapters = page.data?.volumes[volumeIndex]?.chapters;
                if (pageChapters === undefined) {
                    // This *really* shouldn't be possible, since even the volume not being paginated has an empty list here
                    // So something big must have changed for us to get here
                    throw new Error("Something changed on the site backend (no chapters in volume)");
                }
                pageChapters.forEach((chapter) => {
                    // Create li (empty for now) and link for chapter
                    let chapterLI = createElementWithTextContent("li", "");
                    let chapterA = createElementWithTextContent("a", chapter.title);
                    // If the chapter is locked, add lock emoji
                    if (chapter.is_locked) chapterA.innerText += " (🔒)";
                    chapterA.href = new URL(this.siteUrl + `/read/chapter/${chapter.id}/${chapter.slug}`);
                    chapterLI.appendChild(chapterA);
                    chaptersUL.appendChild(chapterLI);
                });
                // Add 1 to page count
                pageNumber+=1;
                // Fetch next page if we're still continuing
                if (pageNumber<=pageCount) {
                    dataUrl.searchParams.set("page", pageNumber);
                    page = await this.fetchCache.fetch(dataUrl);
                }
            } while (pageNumber<=pageCount);
            doc.content.appendChild(chaptersUL);
        }
        return doc.dom;
    }

    removeNextAndPreviousChapterHyperlinks() {
        return; // NO-OP: We'll never have previous and next chapter hyperlinks.
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findChapterTitle(dom) {
        return dom.title;
    }

    async loadEpubMetaInfo(dom) {
        // Get the canonical URL from the DOM
        let url = dom.querySelector("link[rel=\"canonical\"]");
        // Get the API URL for the novel
        let apiUrl = await this.dispatchOnChapterOrNovel(url.href, async (chapterUrl) => {
            // Get chapter JSON object
            let data = await this.fetchCache.fetch(chapterUrl);
            // Get novel slug
            let novelSlug = data.data?.novel?.slug;
            if (novelSlug === undefined) {
                throw new Error("Something changed on the site backend (no volume info in chapter)");
            }
            return this.novelAPIFromSlug(novelSlug);
        },async (novelUrl) => novelUrl);
        // Fetch the novel data
        let response = await this.fetchCache.fetch(apiUrl);
        if (response.data === undefined) {
            throw new Error("Something changed on the site backend (no novel info)");
        }
        this.noveldata = response.data;
    }

    extractTitle() {
        return this.noveldata.title;
    }

    extractAuthor() {
        let authorName = this.noveldata.author_name;
        let authorUserName = this.noveldata.author_user_name;
        if (authorName == authorUserName) return authorName;
        return `${authorName} (TL by ${authorUserName})`;
    }

    extractDescription() {
        let doc = Parser.makeEmptyDocForContent(this.siteUrl);
        doc.content.innerHTML = this.noveldata.description;
        return doc.content.textContent;
    }

    extractPublisher() {
        return this.publisher;
    }

    findCoverImageUrl() {
        let cover_key = this.noveldata?.featured_image_key;
        if (cover_key === undefined) {
            return this.siteUrl + "/images/default-cover.jpg";
        } else {
            return this.apiUrl + "/api/media/k/" + btoa(cover_key);
        }
    }

}