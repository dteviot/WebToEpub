"use strict";

parserFactory.register("bookalb.com", () => new NoblemtlParser());
parserFactory.register("ckandawrites.online", () => new NoblemtlParser());
parserFactory.register("daotranslate.com", () => new NoblemtlParser());
parserFactory.register("faloomtl.com", () => new NoblemtlParser());
parserFactory.register("genesistls.com", () => new NoblemtlParser());
parserFactory.register("moonlightnovel.com", () => new MoonlightNovelParser());
parserFactory.register("noblemtl.com", () => new NoblemtlParser());
parserFactory.register("novelsparadise.net", () => new PandamtlParser());
parserFactory.register("tamagotl.com", () => new NoblemtlParser());
parserFactory.register("knoxt.space", () => new NoblemtlParser());
parserFactory.register("novelsknight.com", () => new NoblemtlParser());

parserFactory.register("pandamtl.com", () => new PandamtlParser());
parserFactory.register("whitemoonlightnovels.com", () => new WhitemoonlightnovelsParser());

class NoblemtlParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(this.linkToChapter)
            .reverse()
    }

    linkToChapter(link) {
        let title = link.querySelector(".epl-num").textContent + " "
            + link.querySelector(".epl-title").textContent;
        return ({
            sourceUrl:  link.href,
            title: title
        });
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        let toRemove = [...element.querySelectorAll("p")]
            .filter(p => p.style.opacity === "0");
        util.removeElements(toRemove);
        util.removeElements(this.findEmptySpanElements(element));
        util.removeChildElementsMatchingCss(element, "span.modern-footnotes-footnote__note");
        util.removeChildElementsMatchingCss(element, "span.footnote_tooltip");
        util.removeChildElementsMatchingCss(element, "div#hpk");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findEmptySpanElements(element) {
        return [...element.querySelectorAll("span")]
            .filter(s => !s.firstChild);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".thumbook");
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingCss(webPageDom, "div.saboxplugin-wrap, div.code-block");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synp .entry-content")];
    }
}

class PandamtlParser extends NoblemtlParser{
    constructor() {
        super();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".sertothumb");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.sersys.entry-content")];
    }
}

class WhitemoonlightnovelsParser extends PandamtlParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(this.linkToChapter)
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, ".code-block");
    }
}

class MoonlightNovelParser extends PandamtlParser{
    constructor() {
        super();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".cat-series")
            || super.findChapterTitle(dom);
    }
}
