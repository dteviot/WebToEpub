"use strict";

parserFactory.register("novelarrow.com", () => new NovelarrowParser());

class NovelarrowParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".jsx-6d23f35167deb67d.space-y-6 a")]
            .map(a => ({
                sourceUrl: a.href,
                title: a.querySelector("span.hidden")?.textContent,
            }))
            .reverse();
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
        let doc = util.sanitize(`<div class='${Parser.WEB_TO_EPUB_CLASS_NAME}'>"${title}${content}</div>`);
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
            .replace(/\\n/g, "");
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
