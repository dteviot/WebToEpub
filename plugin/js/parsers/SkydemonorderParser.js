"use strict";

parserFactory.register("skydemonorder.com", () => new SkydemonorderParser());

class SkydemonorderParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // eslint-disable-next-line
        return [...dom.querySelectorAll("a.block.py-2\\\.5.border-b.border-border.group")]
            .map(a => this.hyperLinkToChapter(a))
            .reverse();
    }

    hyperLinkToChapter(link) {
        let titleText = link.querySelector("span").textContent.trim();

        return {
            sourceUrl: link.href,
            title: `${titleText}`,
        };
    }

    preprocessRawDom(webPageDom) {
        for (let tag of webPageDom.querySelectorAll("live, comments, epicstream")) {
            let div = webPageDom.createElement("div");
            while (tag.firstChild) {
                div.appendChild(tag.firstChild);
            }
            tag.replaceWith(div);
        }
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        let h1 = dom.querySelector("h1");
        return h1 ? h1.textContent.trim() : "";
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.w-full img");
        if (img) {
            let alpineSrc = img.getAttribute(":src");
            if (alpineSrc) {
                let match = alpineSrc.match(/'(https:\/\/[^']+)'/);
                if (match) {
                    return match[1];
                }
            }
            return img.src;
        }
        return null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[x-ref='desc'] p")];
    }
}
