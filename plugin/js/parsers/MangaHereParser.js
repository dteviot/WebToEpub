/*
  Parses Manga
*/
"use strict";

parserFactory.register("www.mangahere.cc", function() { return new MangaHereParser() });

class MangaHereParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div#chapterlist li a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
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

    async fetchChapter(url) {
        // need to open chapter in tab so cookies are loaded
        let tabToClose = await MangaHereParser.createChapterTab(url);
        await util.sleep(5000);
        await MangaHereParser.closeChapterTab(tabToClose);
        let xhr = await HttpClient.wrapFetch(url);
        let newDoc = Parser.makeEmptyDocForContent();
        newDoc.dom.base = url;
        let jsonUrls = MangaHereParser.makeImgJsonUrls(url, xhr.responseXML);
        let imgUrls = MangaHereParser.extractImgUrlsFromDom(xhr.responseXML);
        if (jsonUrls.length <= imgUrls.length) {
            MangaHereParser.addImgsToNewDoc(newDoc, imgUrls, new Set());
            return newDoc.dom;
        }
        return MangaHereParser.buildPageWithImageTags(jsonUrls, new Set(), newDoc, "");
    }

    static extractImgUrlsFromDom(dom) {
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.innerHTML.includes("eval(function(p,a,c,k,e,d){"))
            .map(s => s.innerHTML);

        return (script.length === 1)
            ? MangaHereParser.decryptChapterFun(script[0], "")
            : [];
    }

    static createChapterTab(url) {
        return new Promise(function(resolve) {
            chrome.tabs.create({ url: url, active: false },
                function (tab) {
                    resolve(tab.id);
                }
            );
        });
    }

    static closeChapterTab(tabId) {
        return new Promise(function(resolve) {
            chrome.tabs.remove(tabId, () => resolve());
        });
    }

    static async buildPageWithImageTags(jsonUrls, imgUrls, newDoc, err) {

        if (!util.isNullOrEmpty(err)) {
            ErrorLog.log(err);
            return newDoc.dom;
        }
        if (jsonUrls.length <= imgUrls.size) {
            return newDoc.dom;
        }
        let tocUrl = jsonUrls[imgUrls.size];
        let js = await HttpClient.fetchText(tocUrl);
        err = MangaHereParser.responseToImg(newDoc, js, tocUrl, imgUrls);
        return MangaHereParser.buildPageWithImageTags(jsonUrls, imgUrls, newDoc, err);
    }

    static makeImgJsonUrls(url, dom) {
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

    static responseToImg(newDoc, js, tocUrl, imgUrls) {
        if (util.isNullOrEmpty(js)) {
            return `No response for URL ${tocUrl}\r\n`;
        } else {
            let urls = MangaHereParser.decryptChapterFun(js);
            MangaHereParser.addImgsToNewDoc(newDoc, urls, imgUrls);
            return "";
        }
    }

    static addImgsToNewDoc(newDoc, urls, imgUrls) {
        for(let u of urls) {
            if (!imgUrls.has(u)) {
                imgUrls.add(u);
                let img = newDoc.dom.createElement("img");
                img.src = u;
                newDoc.content.appendChild(img);
            }
        }
    }

    static decryptChapterFun(js, prefix) {
        let d = MangaHereParser.extractDataFromjs(js);
        let clearText = MangaHereParser.decrypt(d[0], d[1], d[2], d[3].split("|"), 0, {});
        return MangaHereParser.extractFilenameFromClearText(clearText, prefix);
    }

    static extractDataFromjs(js) {
        let text = util.extactSubstring(js, "return p;}('" , ".split(");
        text = text.replace(/"/g, "\\\"").replace(/'/g, "\"");
        return JSON.parse("[\"" + text + "]");
    }

    static extractFilenameFromClearText(clearText, prefix) {
        if (prefix === undefined) {
            prefix = util.extactSubstring(clearText, "\"", "\"");
        }
        if (!clearText.includes("[") || !clearText.includes("]")) {
            return [];
        }
        let urls = util.extactSubstring(clearText, "[", "]").split(",");
        return urls.map(u => "http:" + prefix + u.replace(/"/g, ""));
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
