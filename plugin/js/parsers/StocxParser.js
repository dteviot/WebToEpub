"use strict";

parserFactory.register("sto.cx", () => new StocxParser());

class StocxParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let scripts = StocxParser.findScriptElementWithChapterInfo(dom);
        let chapters = [];
        if (0 < scripts.length) {
            let chapInfo = StocxParser.extractChapterGenInfo(scripts[0]);
            for (let i = 1; i <= chapInfo.maxPage; ++i) {
                chapters.push({
                    sourceUrl: `https://www.sto.cx/book-${chapInfo.bookId}-${i}.html`,
                    title: `${i}`
                });
            }
        }
        return Promise.resolve(chapters);
    }

    static findScriptElementWithChapterInfo(dom) {
        return [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes(StocxParser.chapterGenTag))
            .map(s => s.textContent);
    }

    static extractChapterGenInfo(script) {
        let index = script.indexOf(StocxParser.chapterGenTag);
        let split = script.substring(index).split(",");
        return {
            bookId: parseInt(split[1]),
            maxPage: parseInt(split[2]),
        };
    }

    findContent(dom) {
        return dom.querySelector("div#BookContent");
    }

    extractLanguage() {
        return "cn";
    }

    customRawDomToContentStep(chapter, content) {
        let fix = StocxParser.getTextNodesToFixUp(content);
        for (let node of fix) {
            node.nodeValue = StocxParser.fixMangledText(node.nodeValue);
        }
    }

    static getTextNodesToFixUp(content) {
        let n = null; 
        let nodes = [];
        let walk = document.createTreeWalker(content,NodeFilter.SHOW_TEXT,null,false);
        while ((n = walk.nextNode()) !== null) {
            if (n.nodeValue.includes("%")) {
                nodes.push(n);
            }
        }
        return nodes;
    }

    static fixMangledText(text) {
        let bytes = [];
        let i = 0;
        while (i < text.length) {
            if (StocxParser.isEncodeddByte(text, i)) {
                bytes.push(StocxParser.decodeByte(text, i));
                i += 3;
            } else {
                let utf = StocxParser.getUtf8encoder().encode(text[i]);
                for (let u of utf) {
                    bytes.push(u);
                }
                ++i;
            }
        }
        return StocxParser.getUtf8decoder().decode(new Uint8Array(bytes));
    }

    static isEncodeddByte(text, index) {
        return (index + 2 < text.length)
            && (text[index] === "%")
            && (StocxParser.isHexChar(text[index + 1]))
            && (StocxParser.isHexChar(text[index + 2]));
    }

    static isHexChar(char) {
        return !isNaN(parseInt(char[0], 16));
    }

    static decodeByte(text, index) {
        return parseInt(text.substring(index + 1, index + 3), 16);
    }

    static getUtf8decoder() {
        if (StocxParser.utf8decoder === undefined) {
            StocxParser.utf8decoder = new TextDecoder("utf-8");
        }
        return StocxParser.utf8decoder;
    }

    static getUtf8encoder() {
        if (StocxParser.utf8encoder === undefined) {
            StocxParser.utf8encoder = new TextEncoder();
        }
        return StocxParser.utf8encoder;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }
}

StocxParser.chapterGenTag = "ANP_goToPage(";