"use strict";

parserFactory.register("secondlifetranslations.com", () => new SecondlifetranslationsParser());

class SecondlifetranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        for (let button of [...dom.querySelectorAll("button.accordion")]) {
            chapters.push(...util.hyperlinksToChapterList(button.nextElementSibling));
        }
        return chapters;
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

    async fetchChapter(url) {
        let dom = await super.fetchChapter(url);
        await SecondlifetranslationsParser.ensureMap(dom);
        SecondlifetranslationsParser.decodeJmbl(dom);
        return dom;
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        util.removeChildElementsMatchingSelector(content, ".code-block");
        SecondlifetranslationsParser.removeOffsiteImages(content);
        let footnotes = [...content.querySelectorAll("span.modern-footnotes-footnote__note")];
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    static removeOffsiteImages(content) {
        if (content == null) {
            return;
        }
        for (let img of [...content.querySelectorAll("img")]) {
            let raw = (img.getAttribute("src") || "").trim();
            let keep = false;
            try {
                let url = new URL(raw, content.baseURI);
                keep = (url.protocol === "http:" || url.protocol === "https:") &&
                    url.hostname.endsWith("secondlifetranslations.com") &&
                    !raw.includes(";base64,") &&
                    url.pathname.length < 500;
            } catch {
                keep = false;
            }
            if (!keep) {
                let wrap = img.closest("figure");
                (wrap ?? img).remove();
            }
        }
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
        return SecondlifetranslationsParser.decodeStringWith(
            SecondlifetranslationsParser.activeMap(),
            text
        );
    }

    static decodeStringWith(map, text) {
        let out = "";
        for (let ch of text) {
            out += map.get(ch) ?? ch;
        }
        return out;
    }

    static activeMap() {
        return SecondlifetranslationsParser.liveMap ?? SecondlifetranslationsParser.MAP;
    }

    static buildMap(from, to) {
        let map = new Map();
        for (let i = 0; i < from.length; ++i) {
            map.set(from[i], to[i]);
        }
        return map;
    }

    static async ensureMap(dom) {
        if (SecondlifetranslationsParser.liveMap !== null) {
            return;
        }
        if (SecondlifetranslationsParser.liveMapReady === null) {
            SecondlifetranslationsParser.liveMapReady =
                SecondlifetranslationsParser.buildLiveMap(dom).catch(() => null);
        }
        let map = await SecondlifetranslationsParser.liveMapReady;
        if (map !== null && !SecondlifetranslationsParser.isIdentityMap(map)) {
            SecondlifetranslationsParser.liveMap = map;
        }
    }

    static isIdentityMap(map) {
        for (let [from, to] of map) {
            if (from !== to) {
                return false;
            }
        }
        return true;
    }

    static async buildLiveMap(dom) {
        let scrambleUrl = await SecondlifetranslationsParser.scrambleFontUrl(dom);
        await SecondlifetranslationsParser.addFontFace(
            SecondlifetranslationsParser.REF_FACE,
            SecondlifetranslationsParser.REF_FONT_URLS
        );
        await SecondlifetranslationsParser.addFontFace(
            SecondlifetranslationsParser.SCRAMBLE_FACE,
            [scrambleUrl]
        );
        let ref = SecondlifetranslationsParser.rasterize(SecondlifetranslationsParser.REF_FACE);
        let scrambled = SecondlifetranslationsParser.rasterize(SecondlifetranslationsParser.SCRAMBLE_FACE);
        let map = new Map();
        for (let [ch, pixels] of scrambled) {
            let best = ch;
            let bestD = Infinity;
            for (let [refCh, refPixels] of ref) {
                let d = SecondlifetranslationsParser.pixelDistance(pixels, refPixels);
                if (d < bestD) {
                    bestD = d;
                    best = refCh;
                }
            }
            map.set(ch, best);
        }
        return map;
    }

    static async scrambleFontUrl(dom) {
        let link = dom.querySelector("link[href*='slt-scrmbl'], link[href*='slt-scramble']");
        if (link?.href) {
            try {
                let css = await HttpClient.fetchText(link.href);
                let urls = [...css.matchAll(/url\(\s*['"]?([^'")\s]+)/g)].map(m => m[1]);
                let fontPath = urls.find(u => /\.ttf(\?|$)/i.test(u)) ||
                    urls.find(u => /\.woff2(\?|$)/i.test(u));
                if (fontPath) {
                    return new URL(fontPath, link.href).href;
                }
            } catch {
                // fall through to the last known font URL
            }
        }
        return SecondlifetranslationsParser.SCRAMBLE_FONT_URL;
    }

    static async addFontFace(family, urls) {
        let lastError = null;
        for (let url of urls) {
            try {
                let xhr = await HttpClient.wrapFetch(url);
                let face = new FontFace(family, xhr.arrayBuffer);
                await face.load();
                document.fonts.add(face);
                return;
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError ?? new Error("Font family \"" + family + "\" did not load");
    }

    static rasterize(family) {
        let size = SecondlifetranslationsParser.GLYPH_SIZE;
        let box = SecondlifetranslationsParser.GLYPH;
        let canvas = new OffscreenCanvas(box, box);
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let buffers = new Map();
        for (let ch of SecondlifetranslationsParser.CHARS) {
            ctx.clearRect(0, 0, box, box);
            ctx.font = size + "px \"" + family + "\"";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#000";
            ctx.fillText(ch, 8, SecondlifetranslationsParser.BASELINE);
            buffers.set(ch, ctx.getImageData(0, 0, box, box).data.slice());
        }
        return buffers;
    }

    static pixelDistance(a, b) {
        let d = 0;
        for (let i = 0; i < a.length; ++i) {
            d += Math.abs(a[i] - b[i]);
        }
        return d;
    }
}

SecondlifetranslationsParser.CHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
SecondlifetranslationsParser.GLYPH = 80;
SecondlifetranslationsParser.BASELINE = 60;
SecondlifetranslationsParser.GLYPH_SIZE = 64;
SecondlifetranslationsParser.REF_FACE = "WebToEpubOpenSansRef";
SecondlifetranslationsParser.SCRAMBLE_FACE = "WebToEpubSltScramble";
SecondlifetranslationsParser.REF_FONT_URLS = [
    "https://github.com/googlefonts/opensans/raw/main/fonts/ttf/OpenSans-Regular.ttf",
    "https://cdn.jsdelivr.net/gh/googlefonts/opensans@main/fonts/ttf/OpenSans-Regular.ttf"
];
SecondlifetranslationsParser.SCRAMBLE_FONT_URL =
    "https://secondlifetranslations.com/wp-content/plugins/slt-scramble-text/public/fonts/opensans-scrambled-webfont.ttf";
SecondlifetranslationsParser.liveMap = null;
SecondlifetranslationsParser.liveMapReady = null;

// fallback if the live font compare fails (current opensans-scrambled-webfont)
SecondlifetranslationsParser.MAP = SecondlifetranslationsParser.buildMap(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "rhbndjzvqkiexcwsfpogytumalVUQXWSAZKBJNTLEDGIRHCPFOMY"
);
