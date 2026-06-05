"use strict";

parserFactory.register("novelsfull.com", () => new NovelsfullParser());

class NovelsfullParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = new URL(dom.baseURI);
        let restUrl = this.chaptersRestUrl(baseUrl);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.jsonToChapters(json, baseUrl);
    }

    jsonToChapters(json, baseUrl) {
        let cleartext = this.decrypt(json.data);
        let elements = JSON.parse(this._utf8_decode(cleartext));
        return elements.map((item) => this.itemToChapter(item, baseUrl));
    }

    decrypt(cyphertext) {
        let _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let d = "", c = 0;
        let n = [];
        for (cyphertext = cyphertext.replace(/[^A-Za-z0-9=+/]/g, ""); c < cyphertext.length; ) {
            n[0] = _keyStr.indexOf(cyphertext.charAt(c++));
            n[1] = _keyStr.indexOf(cyphertext.charAt(c++));
            n[2] = _keyStr.indexOf(cyphertext.charAt(c++));
            n[3] = _keyStr.indexOf(cyphertext.charAt(c++));
            d += String.fromCharCode(n[0] << 2 | n[1] >> 4);
            64 != n[2] && (d += String.fromCharCode((15 & n[1]) << 4 | n[2] >> 2));
            64 != n[3] && (d += String.fromCharCode((3 & n[2]) << 6 | n[3]));
        }
        return d;
    }

    _utf8_decode(text) {
        for (var t = "", a = 0, r = 0; a < text.length; ) {
            r = text.charCodeAt(a);
            if (r < 128) {
                t += String.fromCharCode(r);
                ++a;
            }
            else if (r > 191 && r < 224) {
                t += String.fromCharCode((31 & r) << 6 | 63 & text.charCodeAt(a + 1));
                a += 2;
            }
            else {
                t += String.fromCharCode((15 & r) << 12 | (63 & text.charCodeAt(a + 1)) << 6 | 63 & text.charCodeAt(a + 2));
                a += 3;
            }
        }
        return t;
    }

    chaptersRestUrl(url) {
        let tail = url.pathname.split("/").pop();
        return "https://api.novelsfull.com/api/book/chapter-list/" + tail;
    }

    itemToChapter(item, baseUrl) {
        return ({
            title: item.name,
            sourceUrl: baseUrl.href + "/" + item.slug
        });
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a[itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "header:nth-of-type(2)");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[itemprop='description']")];
    }
}
