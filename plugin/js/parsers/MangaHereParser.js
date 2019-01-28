/*
  Parses Manga
*/
"use strict";

parserFactory.register("www.mangahere.cc", function() { return new MangaHereParser() });

class MangaHereParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div#chapterlist li a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters.reverse());
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    convertSelectToImgTagsToFollow(dom, content, select) {
        let options = Array.from(select.querySelectorAll("option"));
        for(let option of options.filter(o => !o.value.includes("featured"))) {
            let img = dom.createElement("img");
            img.src = option.value;
            content.appendChild(img);
        };
        
        // first image in list is current page, so replace with image URL 
        // to skip fetching this page again
        let firstImg = this.imageCollector.selectImageUrlFromImagePage(dom);
        content.querySelector("img").src = firstImg;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.detail-info-cover");
    }

    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return MangaHereParser.buildPageWithImageTags(url, xhr.responseXML);
        });
    }

    static buildPageWithImageTags(url, dom) {
        let newDoc = Parser.makeEmptyDocForContent();
        newDoc.dom.base = url;

        let sequence = Promise.resolve();
        let err = "";
        for(let tocUrl of MangaHereParser.makeChapterFuncUrls(url, dom)) {
            sequence = sequence.then(function () {
                return HttpClient.fetchText(tocUrl).then(
                    js => err += MangaHereParser.responseToImg(newDoc, js, tocUrl)
                );
            }); 
        }
        return sequence.then(function () {
            if (!util.isNullOrEmpty(err)) {
                ErrorLog.log(err);
            }
            return newDoc.dom;
        });
    }

    static makeChapterFuncUrls(url, dom) {
        let script = [...dom.querySelectorAll("script")]
            .filter(MangaHereParser.isWantedScriptElement)
            .map(s => s.innerHTML);

        let chapterId = util.extactSubstring(script[0], MangaHereParser.chatperIdPrefix, ";");
        let imageCount = parseInt(util.extactSubstring(script[0], /var\s*imagecount\s*=\s*/, ";"));

        let index = url.lastIndexOf("/");
        let root = url.substring(0, index + 1);
        let urls = [];
        for(let i = 1; i <= imageCount; ++i) {
            urls.push(`${root}chapterfun.ashx?cid=${chapterId}&page=${i}`);
        }
        return urls;
    }

    static isWantedScriptElement(script) {
        let match = script.innerHTML.match(MangaHereParser.chatperIdPrefix);
        return (match !== null);
    }

    static responseToImg(newDoc, js, tocUrl) {
        if (util.isNullOrEmpty(js)) {
            return `No response for URL ${tocUrl}\r\n`;
        } else {
            let img = newDoc.dom.createElement("img");
            img.src = MangaHereParser.decryptChapterFun(js);
            newDoc.content.appendChild(img);
            return "";
        }
    }

    static decryptChapterFun(js) {
        let d = MangaHereParser.extractDataFromjs(js);
        let clearText = MangaHereParser.decrypt(d[0], d[1], d[2], d[3].split("|"), 0, {});
        return MangaHereParser.extractFilenameFromClearText(clearText);
    }

    static extractDataFromjs(js) {
        let text = util.extactSubstring(js, "return p;}('" , ".split(");
        text = text.replace(/"/g, "\\\"").replace(/'/g, "\"");
        return JSON.parse("[\"" + text + "]");
    }

    static extractFilenameFromClearText(clearText) {
        let strings = clearText.split("\"");
        return "http:" + strings[1] + strings[3];
    }

    // extracted from MangaHere
    static decrypt(p, a, c, k, e, d) {
        e = function (c) {
            return (c < a ? "" : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
        };
        if (!"".replace(/^/, String)) {
            while (c--)
                d[e(c)] = k[c] || e(c);
            k = [function (e) {
                return d[e]
            }];
            e = function () { return "\\w+" };
            c = 1;
        };
        while (c--)
            if (k[c])
                p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
        return p;        
    }
}

MangaHereParser.chatperIdPrefix = /var\s*chapterid\s*=\s*/;
