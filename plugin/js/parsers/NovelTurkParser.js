"use strict";

parserFactory.register("novelturk.com", () => new NovelTurkParser());

class NovelTurkParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
        this.chapterIdMap = new Map();
        this.nonce = null;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-info h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover");
    }

    extractLanguage() {
        return "tr";
    }

    getChapterUrls(dom) {
        this.nonce = this.extractNonce(dom);

        let chapterLinks = dom.querySelectorAll("div#clwd a.eph-num");
        let chapters = Array.from(chapterLinks).map((link) => {
            let numberElement = link.querySelector("span.ch-num-pill");
            let subTitleElement = link.querySelector("span.ch-sub-title");
            let number = numberElement ? numberElement.textContent.trim() : "";
            let subTitle = subTitleElement ? subTitleElement.textContent.trim() : "";
            let title = subTitle ? `${number} - ${subTitle}` : number;

            this.chapterIdMap.set(link.href, link.getAttribute("data-chapter-id"));

            return {
                sourceUrl: link.href,
                title: title
            };
        });

        
        return chapters.reverse();
    }

    extractNonce(dom) {
        let ratingScript = Array.from(dom.querySelectorAll("script")).find(
            (el) => el.textContent.includes("nt-interactive-rating")
        );
        if (!ratingScript) {
            return null;
        }
        let match = ratingScript.textContent.match(/const\s+nonce\s*=\s*['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }

    async fetchChapter(url) {
        let chapterId = this.chapterIdMap.get(url);
        if (!chapterId) {
            throw new Error("Unable to find chapter id for " + url);
        }
        if (!this.nonce) {
            throw new Error("Unable to find nonce for AJAX request.");
        }

        let body = new URLSearchParams({
            action: "webnovel_get_chapter",
            chapter_id: chapterId,
            nonce: this.nonce
        });

        let response = await fetch(
            "https://novelturk.com/wp-admin/admin-ajax.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest"
                },
                credentials: "include",
                body: body.toString()
            }
        );

        if (!response.ok) {
            throw new Error("HTTP error " + response.status + " fetching " + url);
        }

        let json = await response.json();

        if (!json.success) {
            let isRateLimited =
                typeof json.data === "string" && json.data.includes("fazla istek");

            if (isRateLimited) {
                await new Promise((resolve) => setTimeout(resolve, 65000));
                return this.fetchChapter(url);
            }

            throw new Error(
                "Unexpected response fetching " + url + ": " + JSON.stringify(json)
            );
        }

        if (!json.data || !json.data.content) {
            throw new Error(
                "Unexpected response fetching " + url + ": " + JSON.stringify(json)
            );
        }

        let decodedHtml = this.decodeBase64Utf8(json.data.content);
        return this.buildChapter(decodedHtml, url);
    }

    decodeBase64Utf8(base64) {
        let binary = atob(base64);
        let bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        return new TextDecoder("utf-8").decode(bytes);
    }

    buildChapter(rawHtml, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let content = util.sanitize(rawHtml);
        this.removeAds(content);
        this.stripZeroWidthChars(content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    removeAds(content) {
        util.removeElements(content.querySelectorAll("div.ad-slot"));
    }

    stripZeroWidthChars(content) {
        let doc = content.ownerDocument || content;
        let walker = doc.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            node.nodeValue = node.nodeValue.replace(/[\u200B-\u200F\uFEFF]/g, "");
        }
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }
}