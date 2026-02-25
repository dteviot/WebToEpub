"use strict";

parserFactory.register("b.faloo.com", () => new FalooParser());

class FalooParser extends Parser {
    constructor() {
        super();

        // <1500 isn't safe for books >30 chapters.
        // >2000 is safe for books of any size.
        this.minimumThrottle = 2000;
    }

    async getChapterUrls(dom) {
        // If there are no VIP chapters, get all chapters
        if (!dom.querySelector(".DivVip")) {
            return [...dom.querySelectorAll("div.DivTable div div a")]
                .map(a => util.hyperLinkToChapter(a));
        }

        // If there are VIP chapters, get only first volume
        let menu = dom.querySelector("div.DivTable:nth-child(3)");
        return util.hyperlinksToChapterList(menu);        
    }

    findContent(dom) {
        return dom.querySelector(".noveContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#novelName");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.fs14");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "Zh-CN";
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("div.T-R-T-B2-Box1 a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".T-L-T-C-Box1").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".c_l_title h1");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".imgcss").src;
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb2312")
        });
    }
}