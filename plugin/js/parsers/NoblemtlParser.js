"use strict";

parserFactory.register("bookalb.com", () => new NoblemtlParser());
parserFactory.register("ckandawrites.online", () => new KnoxtspaceParser());
parserFactory.register("daotranslate.com", () => new NoblemtlParser());
parserFactory.register("faloomtl.com", () => new NoblemtlParser());
parserFactory.register("genesistls.com", () => new NoblemtlParser());
parserFactory.register("jobnib.com", () => new PandamtlParser());
parserFactory.register("moonlightnovel.com", () => new PandamtlParser());
parserFactory.register("noblemtl.com", () => new NoblemtlParser());
parserFactory.register("novelsparadise.net", () => new PandamtlParser());
parserFactory.register("tamagotl.com", () => new NoblemtlParser());
parserFactory.register("knoxt.space", () => new KnoxtspaceParser());
parserFactory.register("novelsknight.com", () => new NoblemtlParser());

parserFactory.register("pandamtl.com", () => new PandamtlParser());
parserFactory.register("universalnovel.com", () => new NoblemtlParser());
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

    findChapterTitle(dom, webPage) {
        return webPage.title;
    }

    static buildChapterTitle(dom) {
        let title = "";
        let addText = (selector) => {
            let element = dom.querySelector(selector);
            if (element != null) {
                title += " " +  element.textContent;
            }
        }
        addText("h1.entry-title");
        addText(".cat-series");
        return title;
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

class KnoxtspaceParser extends NoblemtlParser{
    constructor() {
        super();
    }

    findChapterTitle(dom) {
        return NoblemtlParser.buildChapterTitle(dom);
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

    findChapterTitle(dom) {
        return NoblemtlParser.buildChapterTitle(dom);
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, ".code-block");
    }
}
