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
        return Parser.findConstrutedContent(dom);
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
        let encoded = [...webPageDom.querySelectorAll("script")]
            .filter(s => this.isContent(s))
            .map(s => this.extractContentString(s.textContent))[0];
        return encoded
            ? this.cleanUnicode(encoded)
            : "";
    }

    cleanUnicode(s) {
        return s.replace(/\\u003c/g, "<")
            .replace(/\\u003e/g, ">")
            .replace(/\\"/g, "\"")
            .replace(/\\n/g, "")
            .replace(/\\u0026nbsp;/g, " ")
            .replace(/\\u0026amp;/g, "&")
            .replace(/\\u0026quot;/g, "\"")
            .replace(/\\u0026#39;/g, "'")
            .replace(/\\u0026mdash;/g, "—")
            .replace(/\\u0026hellip;/g, "…")
            .replace(/\\u0026rArr;/g, "→")
            .replace(/\\u0026gt;/g, ">")
            .replace(/\\u0026lt;/g, "<")
            .replace(/\\u0026ecirc;/g, "ê")
            .replace(/\\u0026eacute;/g, "é")
            .replace(/\\u0026agrave;/g, "à")
            .replace(/\\u0026ntilde;/g, "ñ")
            .replace(/\\r\\r/g, "<br>")
            .replace(/\\u0026ldquo;/g, "“")
            .replace(/\\u0026rdquo;/g, "”")
            .replace(/\\u0026lsquo;/g, "‘")
            .replace(/\\u0026rsquo;/g, "’")
            .replace(/\\u0026ndash;/g, "–")
            .replace(/\\u0026laquo;/g, "«")
            .replace(/\\u0026raquo;/g, "»")
            .replace(/\\u0026igrave;/g, "ì")
            .replace(/\\u0026ocirc;/g, "ô")
            .replace(/\\u0026Auml;/g, "Ä")
            .replace(/\\u0026auml;/g, "ä")
            .replace(/\\u0026ouml;/g, "ö")
            .replace(/\\u0026iuml;/g, "ï")
            .replace(/\\u0026Atilde;/g, "Ã")
            .replace(/\\u0026para;/g, "¶")
            .replace(/\\u0026ccedil;/g, "ç")
            .replace(/\\u0026deg;/g, "°")
            .replace(/\\u0026egrave;/g, "è")
            .replace(/\\u000b;/g, " ")
            .replace(/\\u0026;/g, "\\");

    }

    extractContentString(raw) {
        let start = raw.indexOf("\"");
        let end = raw.lastIndexOf("\"");
        return raw.substring(start + 1, end);
    }

    isContent(script) {
        let text = script.textContent;
        if (text.includes("self.__next_f.push([1,")) {
            let s = this.extractContentString(text);
            return s.startsWith("\\u003c");
        }
        return false;
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
