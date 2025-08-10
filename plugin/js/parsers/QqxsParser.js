"use strict";

//dead url/ parser
parserFactory.register("m.qqxs.vip", () => new QqxsParser());

class QqxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocUrl = dom.querySelector("a.btn_toBookShelf")?.href;
        if (tocUrl) {
            dom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        }

        let tocPage1chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            this.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("#chapterlist p a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll("option")]
            .map(o => "https://m.qqxs.vip/" + o.value);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("span.title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#nr_title");
    }

    async fetchChapter(url) {
        let newDoc = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(newDoc);
        let nextPageUrl = this.findNextPageUrl(newDoc);
        while (nextPageUrl != null) {
            let dom = (await HttpClient.wrapFetch(nextPageUrl)).responseXML;
            content.appendChild(this.findContent(dom));
            nextPageUrl = this.findNextPageUrl(dom);
        }
        this.fixImages(content);
        return newDoc;
    }

    findNextPageUrl(dom) {
        let links = [...dom.querySelectorAll("p.Readpage a.p4")]
            .filter(a => a.href.includes("-"));
        return links[0]?.href;
    }

    fixImages(element) {
        let images = [...element.querySelectorAll("img")];
        for (let i of images) {
            if (i.src.includes("juhao.png")) {
                i.remove();
            }
            else if (i.src.includes("gantanhao.png")) {
                i.replaceWith("!");
            }
            else if (i.src.includes("douhao.png")) {
                i.replaceWith(",");
            }
            else if (i.src.includes("wenhao.png")) {
                i.replaceWith("?");
            }
        }
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".synopsisArea");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.review")];
    }
}
