"use strict";

parserFactory.register("secondlifetranslations.com", () => new SecondlifetranslationsParser());

class SecondlifetranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("button.accordion").nextElementSibling;
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.novelcover");
        return img === null ? null : img.src;
    }

    preprocessRawDom(webPageDom) {
        SecondlifetranslationsParser.decodeJmbl(webPageDom);
        let content = this.findContent(webPageDom);
        util.removeChildElementsMatchingSelector(content, ".code-block");
        let footnotes = [...content.querySelectorAll("span.modern-footnotes-footnote__note")];
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-entry-content")];
    }

    static decodeJmbl(dom) {
        util.removeElements(dom.querySelectorAll(".jmbl-disclaimer, .jmbl-ent"));
        for (let el of [...dom.querySelectorAll("span.jmbl")]) {
            SecondlifetranslationsParser.applyMapToElement(el);
            while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
            }
            el.remove();
        }
    }

    static applyMapToElement(el) {
        let walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let nodes = [];
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        for (let node of nodes) {
            node.textContent = SecondlifetranslationsParser.decodeString(node.textContent);
        }
    }

    static decodeString(text) {
        let map = SecondlifetranslationsParser.MAP;
        let out = "";
        for (let ch of text) {
            out += map.get(ch) ?? ch;
        }
        return out;
    }

    static buildMap(from, to) {
        let map = new Map();
        for (let i = 0; i < from.length; ++i) {
            map.set(from[i], to[i]);
        }
        return map;
    }
}

// opensans-scrambled-webfont: HTML letters vs the glyphs they paint
SecondlifetranslationsParser.MAP = SecondlifetranslationsParser.buildMap(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "rhbndjzvqkiexcwsfpogytumalVUQXWSAZKBJNTLEDGIRHCPFOMY"
);
