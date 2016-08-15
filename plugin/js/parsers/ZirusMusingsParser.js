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

        let getChapterArc = function(link) { return null; }
        if (dom.baseURI === "https://zirusmusings.com/ldm-toc/") {
            getChapterArc = that.getChapterArc;
        } 
        let chapters = util.hyperlinksToChapterList(content, that.isChapterHref, getChapterArc);
        return Promise.resolve(chapters);
    }

    isChapterHref(link) {
        return (link.hostname !== "ncode.syosetu.com") &&
            (link.href != "https://wordpress.com/about-these-ads/");
    }

    getChapterArc(link) {
        let arc = null;
        if (link.parentNode !== null) {
            let parent = link.parentNode;
            if (parent.tagName === "P") {
                let strong = util.getElement(parent, "strong");
                if (strong != null) {
                    arc = strong.innerText;
                };
            };
        };
        return arc;
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
            let imagesList = ZirusMusingsParser.findImagesList(dom);
            if (imagesList == null) {
                imagesList = [];
            }
            return ZirusMusingsParser.constructStandardHtmForImgur(imagesList);
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

    static constructStandardHtmForImgur(imagesList) {
        let doc = document.implementation.createHTMLDocument();
        let div = doc.createElement("div");
        doc.body.appendChild(div);
        for(let item of imagesList) {
            let img = doc.createElement("img");
            // ToDo: use real image to build URI
            img.src = "http://i.imgur.com/" + item.hash + item.ext;
            div.appendChild(img);
        };
        return div;
    }

    static findImagesList(dom) {
        // Ugly hack, need to find the list of images as image links are created dynamically in HTML.
        // Obviously this will break each time imgur change their scripts.
        for(let script of util.getElements(dom, "script")) {
            let text = script.innerHTML;
            let index = text.indexOf("\"images\":[{\"hash\"");
            if (index !== -1) {
                text = text.substring(index + 9);
                let endIndex = text.indexOf("}]");
                if (endIndex !== -1) {
                    return JSON.parse(text.substring(0, endIndex + 2));
                }
            }
        }
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        if (dom != null) {
            let content = this.findContent(dom);
            if (content != null) {
                let cover = util.getElement(content, "img");
                if (cover != null) {
                    return cover.src;
                };
            };
        };
        return null;
    }
}
