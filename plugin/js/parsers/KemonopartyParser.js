"use strict";

parserFactory.register("kemono.su", () => new KemonopartyParser());

class KemonopartyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    };

    async getChapterUrlsFromMultipleTocPages(dom, extractPartialChapterList, getUrlsOfTocPages, chapterUrlsUI)  {
        let urlsOfTocPages = getUrlsOfTocPages(dom);
        return await this.getChaptersFromAllTocPages([], extractPartialChapterList, urlsOfTocPages, chapterUrlsUI);
    }

    async fetchChapter(url) {
        return (new TextDecoder().decode((await HttpClient.wrapFetch(url)).arrayBuffer));
    }

    async getChaptersFromAllTocPages(chapters, extractPartialChapterList, urlsOfTocPages, chapterUrlsUI)  {
        if (0 < chapters.length) {
            chapterUrlsUI.showTocProgress(chapters);
        }
        for(let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let json_string = await this.fetchChapter(url);
            let partialList = extractPartialChapterList(json_string);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    async fetchWebPageContent(webPage) {
        let that = this;
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_SLEEPING);
        await this.rateLimitDelay();
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
        let pageParser = webPage.parser;
        return pageParser.fetchChapter(webPage.sourceUrl).then(function (json_string) {
            delete webPage.error;
            webPage.rawDom = Document.parseHTMLUnsafe(`<html><script>${json_string}</script></html>`);
            let content = pageParser.findContent(webPage.rawDom);
            if (content == null) {
                let errorMsg = chrome.i18n.getMessage("errorContentNotFound", [webPage.sourceUrl]);
                throw new Error(errorMsg);
            }
            return pageParser.fetchImagesUsedInDocument(content, webPage);
        }).catch(function (error) {
            if (that.userPreferences.skipChaptersThatFailFetch.value) {
                ErrorLog.log(error);
                webPage.error = error;
            } else {
                webPage.isIncludeable = false;
                throw error;
            }
        }); 
    }

    findCoverImageUrl(dom) {
        let cover = dom.querySelector(".user-header__avatar img");
        return cover.src ?? null;
    }


    getUrlsOfTocPages(dom) {
        let urls = [];
        let paginator = dom.querySelector("div.paginator menu");
        if (paginator === null) {
            return urls;
        }
        let pages = [...paginator.querySelectorAll("a:not(.next)")];
        // add /api/v1/ right after the domain name
        pages[pages.length - 1].href = pages[pages.length - 1].href.replace("https://kemono.su", "https://kemono.su/api/v1");
        // add /posts-legacy right before the query string
        pages[pages.length - 1].href = pages[pages.length - 1].href.replace("?", "/posts-legacy?");
        let url = new URL(pages[pages.length - 1]);
        let lastPageOffset = url.searchParams.get("o");
        for(let i = 0; i <= lastPageOffset; i += 50) {
            url.searchParams.set("o", i);
            urls.push(url.href);
        }
        return urls;
    }

    extractPartialChapterList(json_string) {
        // get href from the dom, not the url of the page
        try {
            let data = JSON.parse(json_string);
            let authorid = data.props.id;
            let ids = data.results.map(result => result.id);
            let titles = data.results.map(result => result.title);
            let urls = ids.map(id => `https://kemono.su/api/v1/patreon/user/${authorid}/post/${id}`);
            return urls.map((url, i) => ({
                sourceUrl: url,
                title: titles[i]
            }));
        } catch (e) {
            return [];
        }
    }

    findContent(dom) {
        //the text of the chapter is always in .post__content, but if there is no chapter(e.g. only files), return .post__body instead of throwing an error
        // return dom.querySelector(".post__content") ?? dom.querySelector(".post__body");
        let data = JSON.parse(dom.querySelector("script").innerHTML);
        // create a dom element from data.post.content;
        let content_dom = document.createElement("div");
        content_dom.innerHTML = data.post.content;
        return content_dom;
    }

    copyImagesIntoContent(dom) {
        let content = this.findContent(dom);
        let images = [...dom.querySelectorAll("div.post__files div.post__thumbnail figure a img")];
        for(let img of images) {
            content.append(img);
        }
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return JSON.parse(dom.querySelector("script").innerHTML).post.title;
    }
}
