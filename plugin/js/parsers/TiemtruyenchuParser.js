"use strict";

parserFactory.register("tiemtruyenchu.com", () => new TiemTruyenChuParser());

class TiemTruyenChuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return Array.from(dom.querySelectorAll(".chapter-page a.chapter-item-link")).map(link => {
            const parent = link.parentElement || link;
            const isLocked = parent.querySelector(".fa-lock, .fa-lock-keyhole, [class*='vip'], [class*='lock']") !== null || 
                             parent.innerHTML.includes("fa-lock");

            return {
                title: link.textContent.trim(),
                sourceUrl: link.href,
                isIncludeable: !isLocked
            };
        });
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1")?.textContent.trim() || super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let authorNode = dom.querySelector("a[href*='/tac-gia/']");
        return authorNode ? authorNode.textContent.trim() : super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let descNode = dom.querySelector(".content-text");
        return descNode ? descNode.innerText.trim() : super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".story-header");
    }

    findChapterTitle(dom) {
        let titleNode = dom.querySelector(".chapter-title") || dom.querySelector("h2");
        return titleNode ? titleNode.textContent.trim() : super.findChapterTitle(dom);
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content") || dom.querySelector(".chapter-content") || dom.querySelector(".content-text");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".ads");
        super.removeUnwantedElementsFromContentElement(element);
    }
}