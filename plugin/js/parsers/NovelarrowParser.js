"use strict";

parserFactory.register("novelarrow.com", () => new NovelarrowParser());

class NovelarrowParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll(".jsx-6d23f35167deb67d.space-y-6 a")]
            .map(a => ({
                sourceUrl: a.href,
                title: a.querySelector("span.hidden")?.textContent,
            }))
            .reverse();

        if (NovelarrowParser.InitialChapterListMaxLength < chapters.length) {
            return chapters;
        }
        return this.fetchChapterListViaRest(dom);
    }

    async fetchChapterListViaRest(dom) {
        let root = dom.baseURI.replace("/novel/", "/chapter/") + "/";
        let restUrl = dom.baseURI.replace("/novel/", "/api-web/novels/") + "/chapters?sort=asc";
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return json.items.map(i => ({
            title: i.chapter_name,
            sourceUrl: root + i.chapter_id,
        }));
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("a[href*='/author/']");
        return (author === null) ? super.extractAuthor(dom) : author.innerText;    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel-cover-frame");
    }

    preprocessRawDom(webPageDom) {
        let content = this.locateContent(webPageDom).trim();
        let title = this.contentHasTitle(content)
            ? ""
            : `<h1>${this.getChapterTitleFromHead(webPageDom)}</h1>`;
        let doc = util.sanitize(`<div class='${Parser.WEB_TO_EPUB_CLASS_NAME}'>${title}${content}</div>`);
        let node = doc.querySelector("."+Parser.WEB_TO_EPUB_CLASS_NAME);
        webPageDom.body.appendChild(node);
    }

    locateContent(webPageDom) {
        for (let script of webPageDom.querySelectorAll("script")) {
            let text = script.textContent;
            if (text.includes("self.__next_f.push([1,")) {
                let start = text.indexOf("[");
                let end = text.lastIndexOf("]");
                try {
                    let json = JSON.parse(text.substring(start, end + 1));
                    if (Array.isArray(json) && json[0] === 1 && typeof json[1] === "string") {
                        let content = json[1];
                        if (content.startsWith("<")) {
                            return content;
                        }
                    }
                } catch {
                    // ignore malformed JSON
                }
            }
        }
        return "";
    }

    contentHasTitle(content) {
        return content.startsWith("<h");
    }

    getChapterTitleFromHead(dom) {
        return dom.head.querySelector("meta[name='og:novel:chapter_name']")
            ?.getAttribute("content") ?? "";
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".site-reading-copy")];
    }
}

// When initially open ToC page, is pre-loaded with up to 30 chapters
NovelarrowParser.InitialChapterListMaxLength = 30;
