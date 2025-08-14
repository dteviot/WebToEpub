"use strict";

parserFactory.registerRule(
    (url, dom) => KemonopartyParser.isKemono(dom),
    () => new KemonopartyParser()
);

class KemonopartyParser extends Parser {
    constructor() {
        super();
    }
    
    static isKemono(dom) {
        let baseurl = new URL(dom.baseURI); 
        return baseurl.hostname.split(".")[0] == "kemono";
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let urlsOfTocPages = await this.getUrlsOfTocPages(dom);
        let baseUrl = new URL(dom.baseURI);
        baseUrl.searchParams.delete("tag");
        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let json = (await HttpClient.fetchJson(url)).json;
            let partialList = this.extractPartialChapterList(json, baseUrl);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            if (partialList.length == 0) {
                break;
            }
        }
        return chapters.reverse();
    }

    async fetchChapter(url) {
        let jsonUrl = new URL(url);
        jsonUrl.pathname = "/api/v1" + jsonUrl.pathname;
        let json = (await HttpClient.fetchJson(jsonUrl.href)).json;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        newDoc.content.appendChild(header);
        header.textContent = json.post.title;
        let content = util.sanitize(json.post.content);
        util.moveChildElements(content.body, newDoc.content);        
        this.copyImagesIntoContent(newDoc.dom);
        this.addFileImages(json, newDoc);
        return newDoc.dom;
    }

    findCoverImageUrl(dom) {
        let cover = dom.querySelector(".user-header__avatar img");
        return cover.src ?? null;
    }

    async getUrlsOfTocPages(dom) {
        let baseurl = new URL(dom.baseURI);
        let urlbuilder = new URL(dom.baseURI);

        for (const [key] of baseurl.searchParams.entries()) {
            urlbuilder.searchParams.delete(key);
        }
        let regex = new RegExp("/?$");
        urlbuilder.href = urlbuilder.href.replace(`https://${baseurl.hostname}`, `https://${baseurl.hostname}/api/v1`).replace(regex, "/posts");
        
        for (const [key, value] of baseurl.searchParams.entries()) {
            urlbuilder.searchParams.set(key, value);
        }
        urlbuilder.searchParams.set("o", 0);
        let lastPageOffset = 0;
        
        try {
            lastPageOffset = this.getLastPageOffset(dom);
        } catch (error) {
            let regex1 = new RegExp("/posts?.+");
            let profile = (await HttpClient.fetchJson(urlbuilder.href.replace(regex1, "/profile"))).json;
            lastPageOffset = profile?.post_count;
        }
        let urls = [];
        for (let i = 0; i <= lastPageOffset; i += 50) {
            urlbuilder.searchParams.set("o", i);
            urls.push(urlbuilder.href);
        }
        return urls;
    }

    getLastPageOffset(dom) {
        let link = [...dom.querySelectorAll("#paginator-top a")].pop();
        let offset = new URL(link?.href)?.searchParams?.get("o");
        return offset
            ? parseInt(offset)
            : 0;
    }

    extractPartialChapterList(data, baseUrl) {
        let buildUrl = (row) => {
            baseUrl.pathname = `/${row.service}/user/${row.user}/post/${row.id}`;
            return baseUrl.href;
        };
        try {
            return data.map((row) => ({
                sourceUrl: buildUrl(row),
                title: row.title
            }));
        } catch (e) {
            return [];
        }
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    copyImagesIntoContent(dom) {
        let content = this.findContent(dom);
        let images = [...dom.querySelectorAll("div.post__files div.post__thumbnail figure a img")];
        for (let img of images) {
            content.append(img);
        }
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    addFileImages(json, newDoc) {
        let images = json?.previews?.filter(p => p.type == "thumbnail");
        if (!images || images.length == 0) {
            return;
        }
        let filesheader = newDoc.dom.createElement("h2");
        newDoc.content.appendChild(filesheader);
        filesheader.textContent = "Files";
        for (let i of images) {
            let img = newDoc.dom.createElement("img");
            img.src = i.server + "/data" + i.path;
            newDoc.content.append(img);
        }
    }
}
