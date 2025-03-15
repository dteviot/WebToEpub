"use strict";

parserFactory.register("kemono.su", () => new KemonopartyParser());

class KemonopartyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let urlsOfTocPages = await this.getUrlsOfTocPages(dom);
        for(let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let json = (await HttpClient.fetchJson(url)).json;
            let partialList = this.extractPartialChapterList(json);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters.reverse();
    };

    async fetchChapter(url) {
        let json = (await HttpClient.fetchJson(url)).json;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        newDoc.content.appendChild(header);
        header.textContent = json.post.title;
        let content = new DOMParser().parseFromString(json.post.content, "text/html");
        for(let n of [...content.body.childNodes]) {
            newDoc.content.appendChild(n);
        }
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
        urlbuilder.href = urlbuilder.href.replace("https://kemono.su", "https://kemono.su/api/v1").replace(regex, "/posts-legacy");
        
        for (const [key, value] of baseurl.searchParams.entries()) {
            urlbuilder.searchParams.set(key, value);
        }
        urlbuilder.searchParams.set("o", 0);

        let urlbuilderjson = (await HttpClient.fetchJson(urlbuilder)).json;
        let lastPageOffset = urlbuilderjson.props.count - (urlbuilderjson.props.count%50);
        let urls = [];
        for(let i = 0; i <= lastPageOffset; i += 50) {
            urlbuilder.searchParams.set("o", i);
            urls.push(urlbuilder.href);
        }
        return urls;
    }

    extractPartialChapterList(data) {
        // get href from the dom, not the url of the page
        try {
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
        return Parser.findConstrutedContent(dom);
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

    addFileImages(json, newDoc) {
        let images = json?.previews?.filter(p => p.type == "thumbnail");
        if (!images || images.length == 0) {
            return;
        }
        let filesheader = newDoc.dom.createElement("h2");
        newDoc.content.appendChild(filesheader);
        filesheader.textContent = "Files";
        for(let i of images) {
            let img = newDoc.dom.createElement("img");
            img.src = i.server + "/data" + i.path;
            newDoc.content.append(img);
        }
    }
}
