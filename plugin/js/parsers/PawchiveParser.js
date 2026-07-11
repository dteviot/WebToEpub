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
        let firstUrl = new URL(dom.baseURI);
        firstUrl.searchParams.set("o", 0);
        let firstHtml = (await HttpClient.wrapFetch(firstUrl.href)).responseXML;

        let baseUrl = new URL(firstHtml.baseURI);
        baseUrl.searchParams.delete("o");
        let nextTocIndex = 50;
        let numChapters = this.getLastPageOffset(firstHtml);
        let nextTocPageUrl = function(_dom, chapters, lastFetch) {
            baseUrl.searchParams.set("o", nextTocIndex);
            nextTocIndex = nextTocIndex + 50;
            return (chapters.length <= numChapters && nextTocIndex <= numChapters+50 && (0 < lastFetch.length))
                ? `${baseUrl.href}`
                : null;
        };
        let chapters = (await this.walkTocPages(firstHtml,
            PawchiveParser.getChapterUrlsFromTocPage,
            nextTocPageUrl,
            chapterUrlsUI
        )).reverse();
        return chapters;
    }

    static getChapterUrlsFromTocPage(dom) {
        if (dom == null) {
            return [];
        }
        let baseurl = new URL(dom.baseURI);
        let urlbuilder = new URL(dom.baseURI);

        for (const [key] of baseurl.searchParams.entries()) {
            urlbuilder.searchParams.delete(key);
        }
        let regex = new RegExp("/$");
        urlbuilder.pathname = urlbuilder.pathname.replace(regex, "");
        let links = [...dom.querySelectorAll("article a")];
        links = links.filter(a => a.href.includes(urlbuilder.href+"/post"));
        return links.map(a => ({
            sourceUrl: a.href, 
            title: a.querySelector("header").textContent.trim()
        }));
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

        let content = util.sanitize(this.escapeUnknownTags(post.content));
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

    escapeUnknownTags(html) {
        return html.replace(/<([^<>]+)>/g, (match, inner) => {
            let candidate = inner.trim();
            if (candidate.startsWith("!--") ||
                /^!doctype\b/i.test(candidate) ||
                candidate.startsWith("?")) {
                return match;
            }
            let tag = candidate.match(/^\/?\s*([A-Za-z][\w:-]*)/);
            if (tag !== null && this.isKnownHtmlTag(tag[1])) {
                return match;
            }
            return `&lt;${inner}&gt;`;
        });
    }

    isKnownHtmlTag(tagName) {
        let element = document.createElement(tagName);
        return element.constructor.name !== "HTMLUnknownElement";
    }

    buildImageUrl(path) {
        return new URL(
            "/thumbnail/data" + this.normalizePath(path),
            "https://img.pawchive.pw"
        ).href;
    }

    buildFileUrl(path) {
        return new URL("/data" + this.normalizePath(path), "https://pawchive.pw")
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

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }
}
