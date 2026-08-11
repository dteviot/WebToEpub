"use strict";

parserFactory.register("razure.org", () => new RazureParser());

class RazureParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#titlemove h1.entry-title");
    }

    extractAuthor(dom) {
        let authorRow = [...dom.querySelectorAll("div.tsinfo div.imptdt")]
            .find((row) => row.textContent.trim().startsWith("Author"));
        let authorValue = authorRow?.querySelector("i");
        if (!authorValue) {
            return super.extractAuthor(dom);
        }
        return authorValue.textContent.split(",")[0].trim();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.thumb");
    }

    extractLanguage() {
        return "en";
    }

    getChapterUrls(dom) {
        let chapterItems = dom.querySelectorAll("#chapterlist ul.clstyle li");

        let chapters = [...chapterItems]
            .filter((li) => !(li.getAttribute("data-num") || "").includes("🔒"))
            .map((li) => {
                let link = li.querySelector("div.eph-num a");
                let numberElement = link.querySelector("span.chapternum");
                return {
                    sourceUrl: link.href,
                    title: numberElement ? numberElement.textContent.trim() : link.textContent.trim()
                };
            });

        return chapters.reverse();
    }

    findContent(dom) {
        return dom.querySelector("#readerarea");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll(".category-footer-messages"));
        let title = element.querySelector("h1");
        if (title) {
            title.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}