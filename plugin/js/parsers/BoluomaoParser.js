"use strict";

parserFactory.register("boluomao.com", () => new BoluomaoParser());
parserFactory.register("boluomao1.com", () => new BoluomaoParser());

class BoluomaoParser extends Parser {
    constructor() {
        super();
    }

    decodeObf(s) {
        if (!s) return "";
        let raw = atob(s);
        let bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            bytes[i] = raw.charCodeAt(i) ^ ((i % 127) + 1);
        }
        return new TextDecoder('utf-8').decode(bytes);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.bookTitleLeft h1");
    }

    extractAuthor(dom) {
        let authorNode = dom.querySelector("a.author");
        return authorNode ? authorNode.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book div.pic");
    }

    extractSubject(dom) {
        let tag = dom.querySelector("div.info dl dd a");
        return tag ? tag.textContent.trim() : "";
    }

    extractDescription(dom) {
        let descNode = dom.querySelector("#bookIntro span.obf-html");
        if (descNode && descNode.hasAttribute("data-obf-html")) {
            let htmlDesc = this.decodeObf(descNode.getAttribute("data-obf-html"));
            let tempDiv = dom.createElement('div');
            tempDiv.innerHTML = htmlDesc;
            return tempDiv.textContent.trim();
        }
        return dom.querySelector("#bookIntro")?.textContent.trim() ?? "";
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let extractPartial = (d) => {
            let menu = d.querySelector("div#chapters div.direList ul");
            return util.hyperlinksToChapterList(menu);
        };
        
        let tocPage1chapters = extractPartial(dom);
        let pageLinks = [...dom.querySelectorAll("div.page2-chapter a[href*='?cp=']")];
        let urlsOfTocPages = pageLinks.map(a => a.href);
        
        return (await this.getChaptersFromAllTocPages(
            tocPage1chapters,
            extractPartial,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    preprocessRawDom(webPageDom) {
        let texts = webPageDom.querySelectorAll('.obf-text[data-obf]');
        for (let node of texts) {
            try {
                node.textContent = this.decodeObf(node.getAttribute('data-obf'));
            } catch (e) {
                console.warn("WebToEpub: Failed to decode text node", e);
            }
        }

        let htmls = webPageDom.querySelectorAll('.obf-html[data-obf-html]');
        for (let node of htmls) {
            try {
                node.innerHTML = this.decodeObf(node.getAttribute('data-obf-html'));
            } catch (e) {
                console.warn("WebToEpub: Failed to decode HTML node", e);
            }
        }
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }
}