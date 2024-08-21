"use strict";

parserFactory.register("arcanetranslations.com", () => new PandamtlParser());
//dead url
parserFactory.register("bookalb.com", () => new NoblemtlParser());
parserFactory.register("ckandawrites.online", () => new KnoxtspaceParser());
parserFactory.register("daotranslate.com", () => new NoblemtlParser());
parserFactory.register("daotranslate.us", () => new NoblemtlParser());
//dead url
parserFactory.register("faloomtl.com", () => new NoblemtlParser());
//dead url
parserFactory.register("genesistls.com", () => new NoblemtlParser());
parserFactory.register("hoxionia.com", () => new NoblemtlParser());
parserFactory.register("jobnib.com", () => new PandamtlParser());
parserFactory.register("moonlightnovel.com", () => new PandamtlParser());
parserFactory.register("noblemtl.com", () => new NoblemtlParser());
parserFactory.register("novelcranel.org", () => new NoblemtlParser());
//dead url
parserFactory.register("novelsparadise.net", () => new PandamtlParser());
//dead url
parserFactory.register("readfreebooksonline.org", () => new NoblemtlParser());
//dead url
parserFactory.register("tamagotl.com", () => new NoblemtlParser());
parserFactory.register("taonovel.com", () => new NoblemtlParser());
parserFactory.register("knoxt.space", () => new KnoxtspaceParser());
//dead url
parserFactory.register("novelsknight.com", () => new NoblemtlParser());
//dead url
parserFactory.register("cyborg-tl.com", () => new NoblemtlParser());

parserFactory.register("pandamtl.com", () => new PandamtlParser());
parserFactory.register("universalnovel.com", () => new NoblemtlParser());
parserFactory.register("whitemoonlightnovels.com", () => new WhitemoonlightnovelsParser());

parserFactory.registerRule(
    (url, dom) => NoblemtlParser.isNoblemtlTheme(dom) * 0.7,
    () => new NoblemtlParser()
);

parserFactory.registerRule(
    (url, dom) => PandamtlParser.isPandamtlTheme(dom) * 0.7,
    () => new PandamtlParser()
);

class NoblemtlParser extends Parser{
    constructor() {
        super();
    }

    static isNoblemtlTheme(dom) {
        return (dom.querySelector("div.eplister a") != null) &&
            (dom.querySelector(".thumbook") != null)
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.eplister a")]
            .map(this.linkToChapter)
            .reverse()
    }

    linkToChapter(link) {
        let title = NoblemtlParser.extractChapterNum(link).trim() + " "
            + link.querySelector(".epl-title").textContent.trim();
        return ({
            sourceUrl:  link.href,
            title: title
        });
    }

    static extractChapterNum(link) {
        let eplnum = link.querySelector(".epl-num");
        let chapnum = eplnum.querySelector(".chapter_num");
        return chapnum == null
            ? eplnum.textContent
            : chapnum.textContent;
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

    static isPandamtlTheme(dom) {
        return (dom.querySelector("div.eplister a") != null) &&
            (dom.querySelector(".sertothumb") != null)
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
