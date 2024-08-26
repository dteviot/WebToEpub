"use strict";

parserFactory.register("arcanetranslations.com", () => new NoblemtlParser());
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
parserFactory.register("jobnib.com", () => new NoblemtlParser());
parserFactory.register("moonlightnovel.com", () => new NoblemtlParser());
parserFactory.register("noblemtl.com", () => new NoblemtlParser());
parserFactory.register("novelcranel.org", () => new NoblemtlParser());
//dead url
parserFactory.register("novelsparadise.net", () => new NoblemtlParser());
//dead url
parserFactory.register("readfreebooksonline.org", () => new NoblemtlParser());
//dead url
parserFactory.register("tamagotl.com", () => new NoblemtlParser());
parserFactory.register("taonovel.com", () => new NoblemtlParser());
parserFactory.register("knoxt.space", () => new KnoxtspaceParser());
parserFactory.register("lazygirltranslations.com", () => new LazygirltranslationsParser());
//dead url
parserFactory.register("novelsknight.com", () => new NoblemtlParser());
//dead url
parserFactory.register("cyborg-tl.com", () => new NoblemtlParser());

parserFactory.register("pandamtl.com", () => new NoblemtlParser());
parserFactory.register("universalnovel.com", () => new NoblemtlParser());
parserFactory.register("whitemoonlightnovels.com", () => new WhitemoonlightnovelsParser());

parserFactory.registerRule(
    (url, dom) => NoblemtlParser.isNoblemtlTheme(dom) * 0.7,
    () => new NoblemtlParser()
);

class NoblemtlParser extends Parser{
    constructor() {
        super();
    }

    static isNoblemtlTheme(dom) {
        return (dom.querySelector("div.eplister a") != null) &&
            (dom.querySelector(".thumbook, .sertothumb") != null);
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
        return util.getFirstImgSrc(dom, ".thumbook, .sertothumb");
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingCss(webPageDom, "div.saboxplugin-wrap, div.code-block");
    }

    getInformationEpubItemChildNodes(dom) {
        let info = dom.querySelector("div.synp .entry-content, div.sersys.entry-content");
        return info == null
            ? []
            : [info];
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

class WhitemoonlightnovelsParser extends NoblemtlParser{
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

class LazygirltranslationsParser extends KnoxtspaceParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (dom.querySelector("div.eplister a"))
        {
            return super.getChapterUrls(dom);
        }
        let menu = dom.querySelector(".page");
        return util.hyperlinksToChapterList(menu);        
    }
}
