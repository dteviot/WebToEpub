/*
  Parses the Lazy Dungeon Master story on https://zirusmusings.com/ldm-ch84/
*/
"use strict";

parserFactory.register("zirusmusings.com", function() { return new ZirusMusingsParser() });

class ZirusMusingsParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let content = that.findContent(dom);
        content = content.cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        let chapters = that.getElements(content, "a", a => that.isChapterHref(a.href))
            .map(element => that.elementToChapterInfo(element));
        return Promise.resolve(chapters);
    }

    isChapterHref(href) {
        return !href.startsWith("http://ncode.syosetu.com");
    }

    elementToChapterInfo(chapterElement) {
        return {
            sourceUrl:  chapterElement.href,
            title: chapterElement.innerText
        }
    }

    extractTitle(dom) {
        return util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:title")).getAttribute("content");
    }

    extractAuthor(dom) {
        return "<unknown>";
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let that = this;

        // Ziru's Musings has links to imgur galleries.
        // So when one of them, create whole new page and return link to that.
        // ToDo: Fix this ugly hack.
        let host = util.extractHostName(dom.documentURI).toLowerCase();
        if (host === "imgur.com") {
            return that.constructStandardHtmForImgur(dom);
        } else {
            let article = util.getElement(dom, "article", e => e.clasName !== "comment-body");
            let div = util.getElement(article, "div");
            return div;
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);

        util.removeElements(that.getElements(element, "div", div => that.isUnwantedDiv(div)));

        // remove the previous | TOC | Next hyperlinks
        let toc = that.findTocElement(element);
        if (toc !== null) {
            util.removeNode(toc.parentNode);
        };
    }

    isUnwantedDiv(div) {
        return ((div.className ==="wpcnt") || div.className.startsWith("sharedaddy"))
    }

    findTocElement(div) {
        return util.getElement(div, "a", a => (0 < a.href.indexOf("toc/")));
    }

    constructStandardHtmForImgur(dom) {
        let ns = "http://www.w3.org/1999/xhtml";
        let doc = util.createEmptyXhtmlDoc();
        let div = dom.createElementNS(ns, "div");
        doc.body.appendChild(div);
        let imageList = this.findImagesList(dom);
        if (imageList != null) {
            for(let item of imageList) {
                let img = dom.createElementNS(ns, "img");
                // ToDo: use real image to build URI
                img.src = "http://i.imgur.com/" + item.hash + item.ext;
                div.appendChild(img);
            };
        };
        return div;
    }

    findImagesList(dom) {
        // Ugly hack, need to find the list of images as image links are created dynamically in HTML.
        // Obviously this will break each time imgur change their scripts.
        for(let script of util.getElements(dom, "script")) {
            let text = script.innerHTML;
            let index = text.indexOf("\"images\":[{\"hash\"");
            if (index !== -1) {
                text = text.substring(index + 9);
                let endIndex = text.indexOf("\"}]");
                if (endIndex !== -1) {
                    return JSON.parse(text.substring(0, endIndex + 3));
                }
            }
        }
    }
}
