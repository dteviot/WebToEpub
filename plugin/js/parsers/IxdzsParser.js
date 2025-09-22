"use strict";

parserFactory.register("ixdzs.tw", () => new IxdzsParser());
parserFactory.register("ixdzs8.com", () => new Ixdzs8Parser());

class IxdzsParser extends Parser {
    constructor() {
        super();
        this.tocPathName = "/novel/html/";
    }

    async getChapterUrls(dom) {
        var tocUrl = new URL(dom.baseURI);
        var bid = this.extractBid(tocUrl.pathname);
        tocUrl.pathname = this.tocPathName;
        let options = {
            method: "POST",
            credentials: "include",
            body: this.makeFormData(bid)
        };
        return await this.fetchChapterUrls(tocUrl.href, options, dom.baseURI);
    }

    async fetchChapterUrls(url, options, baseUri) { // eslint-disable-line no-unused-vars
        let xhr = await HttpClient.wrapFetch(url, {fetchOptions: options});
        return util.hyperlinksToChapterList(xhr.responseXML.body);
    }

    makeFormData(bid) {
        let formData = new FormData();
        formData.append("bid", bid);
        return formData;
    }

    extractBid(path) {
        return path.split("/")
            .filter(s => !util.isNullOrEmpty(s))
            .pop();
    }

    findContent(dom) {
        return dom.querySelector("section");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.bauthor");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.n-img");
    }

    getInformationEpubItemChildNodes(dom) {
        let epubDescription = ([...dom.querySelectorAll("p.pintro")]);
        return epubDescription.map(e => e.textContent.replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, "\n\n").replace(/\u3000/g, ""));
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "p.abg");
        super.removeUnwantedElementsFromContentElement(element);
    }
}

class Ixdzs8Parser extends IxdzsParser {
    constructor() {
        super();
        this.tocPathName = "/novel/clist/";
    }

    async fetchChapterUrls(url, options, baseUri) {
        let json = (await HttpClient.fetchJson(url, options)).json;
        return json.data.map(d => ({
            sourceUrl: `${baseUri}p${d.ordernum}.html`,
            title: d.title,
        }));
    }
}