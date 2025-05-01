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

parserFactory.register("my-novel.online", () => new MyNovelOnlineParser());

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

class MyNovelOnlineParser extends NoblemtlParser{
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    findChapterTitle(dom) {
        return dom.querySelector(".epheader .entry-title");
    }

    findContent(dom) {
        let content = dom.querySelector(".epwrapper .epcontent");
        //there are random links embeded everywhere i think it is to boost other sites on google as the other site is "relevant"
        for(let e of content.querySelectorAll("p.chapter a.num-link")) {
            let pnode = dom.createElement("span");
            pnode.textContent = e.innerText;
            e.replaceWith(pnode);
        }
        return content;
    }

    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("div.post-views, div.chapter-protected-message"));
        super.removeUnwantedElementsFromContentElement(content);
    }
    
    // old api sends sometimes {"page":null} instead of content and it isn't fix 24h later for some chapter example:https://my-novel.online/1008659/
    /*
    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        
        while (json.page == null) {
            await util.sleep(60000);
            json = (await HttpClient.fetchJson(restUrl)).json;
        }
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        // eslint-disable-next-line
        let regex = new RegExp("my-novel.online\/[0-9]+");
        let id = url.substring(url.search(regex)+"my-novel.online/".length).split("/")[0];
        return "https://api.grow.me/sites/629a1740-ed50-4353-bf87-856ca30d58e8/page?url=https%3A%2F%2Fmy-novel.online%2F" +id+ "%2F";
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.page.title.substring(0, json.page.title.length - " - Novels Knights".length);
        newDoc.content.appendChild(title);
        let text = json.page.textContent.replace("\n\n", "\n");
        text = text.split("\n");
        let br = document.createElement("br");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
    */
}