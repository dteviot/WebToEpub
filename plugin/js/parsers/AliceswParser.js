"use strict";

parserFactory.register("alicesw.com", () => new AliceswParser());

class AliceswParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 5000;
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector(".tit a").href;

        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let menu = tocPage.querySelector(".mulu_list");
        return util.hyperlinksToChapterList(menu);
    }

    async fetchChapter(url) {
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".novel_info > p:nth-child(2) a")];
        let tags = [...dom.querySelectorAll(".tags_list a")];
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    findContent(dom) {
        return dom.querySelector(".read-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".j_chapterName");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".pic");
    }

    extractLanguage() {
        return "zh-CN";
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".novel_info > p:nth-child(1) > a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".jianjie p").textContent.trim();
    }

    isCustomError(response) {
        // First check is for captcha, second one for temporary rate limit.
        return (response.responseXML.querySelector(".box h2")?.textContent.trim() == "访问验证") || (response.responseXML.body.innerHTML.includes("cuteAlert("));
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {};
        newresp.response.url = checkedresponse.response.url;
        newresp.response.status = 403;
        return newresp;
    }
}