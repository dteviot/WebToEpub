"use strict";

parserFactory.register("mimihui.com", () => new MimihuiParser());

class MimihuiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector(".chapter-more a").href;

        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let menu = tocPage.querySelector(".chapter-list");

        let chapters = util.hyperlinksToChapterList(menu, link => !link.textContent.trim().endsWith("VIP"));
        
        return chapters;

        /* 
        Will need to handle VIP chapters and clean chapter titles. (Remove 免费 and VIP from the end of it. Only ToC is affected by this.)

        We can still get a sneakpeek of the content of VIP chapters even when locked, ~10 lines, so I didn't make them automatically non-includeable. 
        With them being visible clearly in the ToC with a 'VIP' at the end, if user want to remove them. 
        */
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".info > dl:nth-child(4) > dd a")];
        let tags = [...dom.querySelectorAll(".info > dl:nth-child(5) > dd a")]; 
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "lock");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info > dl:nth-child(2) > dd");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".desc > p").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".info")];
    }
}
