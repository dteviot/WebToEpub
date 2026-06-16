"use strict";

parserFactory.registerRule(
    (url, dom) => PawchiveParser.isPawchive(dom),
    () => new PawchiveParser()
);

class PawchiveParser extends Parser {
    static isPawchive(dom) {
        let baseUrl = new URL(dom.baseURI);
        return baseUrl.hostname.split(".")[0] === "pawchive";
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let urlsOfTocPages = await this.getUrlsOfTocPages(dom);
        let baseUrl = new URL(dom.baseURI);
        baseUrl.search = "";

        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();

            let json = await this.fetchJson(url);
            let partialList = this.extractPartialChapterList(json, baseUrl);

            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);

            if (partialList.length === 0) {
                break;
            }
        }

        return chapters.reverse();
    }

    async fetchChapter(url) {
        let jsonUrl = new URL(url);
        jsonUrl.pathname = "/api/v1" + jsonUrl.pathname;

        let post = await this.fetchJson(jsonUrl.href);
        return this.buildChapter(post, url);
    }

    buildChapter(post, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);

        let header = newDoc.dom.createElement("h1");
        header.textContent = post.title;
        newDoc.content.appendChild(header);

        let content = util.sanitize(post.content);
        util.moveChildElements(content.body, newDoc.content);

        let attachments = post.attachments;
        if (attachments.length > 0) {
            let attachHeader = newDoc.dom.createElement("h2");
            attachHeader.textContent = "Attachments";
            newDoc.content.appendChild(attachHeader);

            for (let att of attachments) {
                if (this.isImageFileName(att.name)) {
                    let img = newDoc.dom.createElement("img");
                    img.src = this.buildImageUrl(att.path);
                    img.alt = att.name;
                    newDoc.content.appendChild(img);
                } else {
                    let link = newDoc.dom.createElement("a");
                    link.href = this.buildFileUrl(att.path);
                    link.textContent = att.name;
                    newDoc.content.appendChild(link);
                    newDoc.content.appendChild(newDoc.dom.createElement("br"));
                }
            }
        }

        return newDoc.dom;
    }

    buildImageUrl(path) {
        return new URL(
            "/data" + this.normalizePath(path),
            "https://file.pawchive.st"
        ).href;
    }

    buildFileUrl(path) {
        return new URL("/data" + this.normalizePath(path), "https://pawchive.st")
            .href;
    }

    normalizePath(path) {
        return path.startsWith("/") ? path : "/" + path;
    }

    isImageFileName(name) {
        name = name.toLowerCase();

        return (
            name.endsWith(".jpg") ||
            name.endsWith(".jpeg") ||
            name.endsWith(".png") ||
            name.endsWith(".gif") ||
            name.endsWith(".webp") ||
            name.endsWith(".bmp") ||
            name.endsWith(".svg")
        );
    }

    findCoverImageUrl(dom) {
        let cover = dom.querySelector(".user-header__avatar img");
        return cover?.src ?? null;
    }

    async getUrlsOfTocPages(dom) {
        let baseUrl = new URL(dom.baseURI);
        let urlBuilder = new URL(dom.baseURI);

        urlBuilder.search = "";
        urlBuilder.pathname = "/api/v1" + baseUrl.pathname.replace(/\/$/, "");

        for (const [key, value] of baseUrl.searchParams.entries()) {
            urlBuilder.searchParams.set(key, value);
        }

        let lastPageOffset = this.getLastPageOffset(dom);
        let urls = [];

        for (let i = 0; i <= lastPageOffset; i += 50) {
            urlBuilder.searchParams.set("o", i);
            urls.push(urlBuilder.href);
        }

        return urls;
    }

    getLastPageOffset(dom) {
        let offsets = [...dom.querySelectorAll("#paginator-top a")]
            .map(item => new URL(item.href).searchParams.get("o"))
            .filter(item => item !== null)
            .map(item => parseInt(item, 10))
            .filter(item => !Number.isNaN(item));

        return offsets.length > 0 ? Math.max(...offsets) : 0;
    }

    async fetchJson(url) {
        let options = {
            headers: {
                Accept: "*/*"
            }
        };

        return (await HttpClient.fetchJson(url, options)).json;
    }

    extractPartialChapterList(data, baseUrl) {
        return data.map(row => {
            let chapterUrl = new URL(baseUrl.href);
            chapterUrl.pathname = `/${row.service}/user/${row.user}/post/${row.id}`;
            chapterUrl.search = "";

            return {
                sourceUrl: chapterUrl.href,
                title: row.title
            };
        });
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }
}