"use strict";

parserFactory.register("mangaread.co", () => new MangaReadParser());

class MangaReadParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.post-title h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let responseXML = (await HttpClient.wrapFetch(url)).responseXML;
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.dom.base = url;
        let imgUrls = this.makeImgUrls(responseXML);
        return this.buildPageWithImageTags(imgUrls, newDoc);
    }

    makeImgUrls(dom) {
        // really, should follow the links in the <option> elements and extract the image url
        // for each page, but this makes fewer calls to mangaread.co
        let img = dom.querySelector(".wp-manga-chapter-img");
        let options = [...dom.querySelector("select#single-pager").querySelectorAll("option")];
        let base = img.getAttribute("data-lazy-src");
        let index = base.lastIndexOf("/");
        base = base.substring(0, index + 1);
        let imgUrls = [];
        for (let i = 1; i <= options.length; ++i) {
            let name = ("00" + i);
            name = name.substring(name.length - 3);
            imgUrls.push(base + name + ".jpg");
        }
        return imgUrls;
    }

    async buildPageWithImageTags(imgUrls, newDoc) {
        for (let u of imgUrls) {
            let img = newDoc.dom.createElement("img");
            img.src = u;
            newDoc.content.appendChild(img);
        }
        return newDoc.dom;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content")];
    }
}
