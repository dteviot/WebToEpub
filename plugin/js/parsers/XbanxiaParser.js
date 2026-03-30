"use strict";

parserFactory.register("xbanxia.cc", () => new XbanxiaParser());

class XbanxiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterList = dom.querySelector("#content-list > div.book-list.clearfix > ul");
        return util.hyperlinksToChapterList(chapterList);
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#nr_title");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-describe h1");
    }

    extractAuthor(dom) {
        let authorLink = dom.querySelector(".book-describe a[href*='/author/']");
        return authorLink?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    extractSubject(dom) {
        return this.extractLabeledValue(dom, ["类型", "類型"]);
    }

    extractDescription(dom) {
        let description = dom.querySelector(".describe-html");
        return description?.textContent?.trim() ?? "";
    }

    findCoverImageUrl(dom) {
        let image = dom.querySelector("#content-list > div.book-intro.clearfix > div.book-img img");
        return image?.getAttribute("data-original") ?? image?.src ?? null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "script, span");
        super.removeUnwantedElementsFromContentElement(element);
    }

    extractLabeledValue(dom, labels) {
        let paragraphs = [...dom.querySelectorAll(".book-describe p")];
        for (let paragraph of paragraphs) {
            let text = paragraph.textContent?.replace(/\s+/g, " ").trim();
            if (text == null) {
                continue;
            }

            for (let label of labels) {
                let match = text.match(new RegExp(`^${label}[：:︰]\\s*(.+)$`));
                if (match != null) {
                    return match[1].trim();
                }
            }
        }

        return "";
    }
}
