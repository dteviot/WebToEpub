// Ai generated Gemini 3.8 Flash
"use strict";

parserFactory.register("starlit-tales.com", () => new StarlitTalesParser());

class StarlitTalesParser extends Parser {
    constructor() {
        super();
        this.novelData = null;
        this.minimumThrottle = 1000;
    }

    async setupHeaders() {
        await HttpClient.setDeclarativeNetRequestRules([
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "Origin",
                            operation: "set",
                            value: "https://starlit-tales.com"
                        },
                        {
                            header: "Referer",
                            operation: "set",
                            value: "https://starlit-tales.com/"
                        }
                    ]
                },
                condition: {
                    urlFilter: "*://api.starlit-tales.com/*"
                }
            }
        ]);
    }

    extractSlug(source) {
        let url = typeof source === "string" ? source : (source?.baseURI || source?.location?.href || "");
        let match = url.match(/\/(?:api\/)?novels?\/([^/?#]+)/);
        return match ? match[1] : null;
    }

    async getNovelData(slug) {
        if (this.novelData && this.novelData.slug === slug) {
            return this.novelData;
        }
        await this.setupHeaders();
        let apiUrl = `https://api.starlit-tales.com/api/novels/${slug}`;
        let response = await HttpClient.fetchJson(apiUrl);
        this.novelData = response.json;
        return this.novelData;
    }

    async loadEpubMetaInfo(dom) {
        let slug = this.extractSlug(dom);
        if (slug) {
            await this.getNovelData(slug);
        }
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let slug = this.extractSlug(dom);
        if (!slug) {
            return [];
        }
        let data = await this.getNovelData(slug);
        let chapters = data?.chapters ?? [];
        let chapterList = chapters.map(c => {
            let chapterNum = c.chapterNumber;
            let rawTitle = (c.title || "").trim();
            let title;
            if (!rawTitle) {
                title = `Chapter ${chapterNum}`;
            } else if (/^chapter\b/i.test(rawTitle)) {
                title = rawTitle;
            } else {
                title = `Chapter ${chapterNum} - ${rawTitle}`;
            }
            let sourceUrl = `https://starlit-tales.com/novel/${slug}/chapter/${chapterNum}`;
            let isFree = Boolean(c.isFree || c.isUnlocked);
            return {
                sourceUrl: sourceUrl,
                title: title,
                isIncludeable: isFree
            };
        });
        if (chapterUrlsUI) {
            chapterUrlsUI.showTocProgress(chapterList);
        }
        return chapterList;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl(dom) {
        if (this.novelData?.title) {
            return this.novelData.title;
        }
        return dom.querySelector("h1, .novel-title");
    }

    extractAuthor(dom) {
        if (this.novelData?.author) {
            return this.novelData.author;
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        if (this.novelData?.coverImage) {
            let img = this.novelData.coverImage;
            return img.startsWith("http") ? img : `https://api.starlit-tales.com${img}`;
        }
        return super.findCoverImageUrl(dom);
    }

    extractDescription(dom) {
        if (this.novelData?.synopsis) {
            return this.novelData.synopsis;
        }
        return super.extractDescription(dom);
    }

    extractSubject(dom) {
        let subjects = [];
        if (Array.isArray(this.novelData?.genres)) {
            subjects.push(...this.novelData.genres);
        }
        if (Array.isArray(this.novelData?.tags)) {
            subjects.push(...this.novelData.tags);
        }
        if (subjects.length > 0) {
            return [...new Set(subjects)].join(", ");
        }
        return super.extractSubject(dom);
    }

    extractLanguage(dom) {
        if (this.novelData?.originalLanguage) {
            return this.novelData.originalLanguage;
        }
        return super.extractLanguage(dom);
    }

    extractDatePublished(dom) {
        if (this.novelData?.createdAt) {
            return this.novelData.createdAt;
        }
        return super.extractDatePublished(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        if (this.novelData?.synopsis) {
            let div = dom.createElement("div");
            let sanitized = util.sanitize(this.novelData.synopsis);
            util.moveChildElements(sanitized.body, div);
            return [div];
        }
        return [];
    }

    async fetchChapter(url) {
        let match = url.match(/\/novel\/([^/]+)\/chapter\/([^/?#]+)/);
        if (!match) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let slug = match[1];
        let chapterNum = match[2];
        await this.setupHeaders();
        let apiUrl = `https://api.starlit-tales.com/api/chapters/${slug}/${chapterNum}`;
        let response = await HttpClient.fetchJson(apiUrl);
        let json = response.json;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        let chapterNum = json.chapterNumber;
        let rawTitle = (json.title || "").trim();
        if (!rawTitle) {
            title.textContent = `Chapter ${chapterNum}`;
        } else if (/^chapter\b/i.test(rawTitle)) {
            title.textContent = rawTitle;
        } else {
            title.textContent = `Chapter ${chapterNum} - ${rawTitle}`;
        }
        newDoc.content.appendChild(title);

        if (json.content) {
            let sanitized = util.sanitize(json.content);
            this.fixRelativeImages(sanitized.body);
            util.moveChildElements(sanitized.body, newDoc.content);
        } else if (!json.isUnlocked) {
            let p = newDoc.dom.createElement("p");
            p.textContent = `[This chapter is locked and requires ${json.heartsCost || 0} stars/hearts to unlock.]`;
            newDoc.content.appendChild(p);
        }

        return newDoc.dom;
    }

    fixRelativeImages(element) {
        for (let img of element.querySelectorAll("img[src]")) {
            let src = img.getAttribute("src");
            if (src && src.startsWith("/")) {
                img.setAttribute("src", "https://api.starlit-tales.com" + src);
            }
        }
    }
}
