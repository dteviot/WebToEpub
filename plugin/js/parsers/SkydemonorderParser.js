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
        const content = dom.querySelector("#chapter-body");

        if (!content) {
            return null;
        }

        const unwrap = element => {
            for (const child of [...element.children]) {
                if (child.tagName !== "P" && child.tagName !== "DIV") {
                    unwrap(child);

                    while (child.firstChild) {
                        element.insertBefore(child.firstChild, child);
                    }

                    child.remove();
                } else {
                    unwrap(child);
                }
            }
        };

        unwrap(content);

        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        let h1 = dom.querySelector("h1");
        return h1 ? h1.textContent.trim() : "";
    }

    findCoverImageUrl(dom) {
        const img = dom.querySelector(
            "div.order-1.flex.justify-center img"
        );

        if (!img) {
            return null;
        }

        return img.getAttribute("src") || img.src || null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[x-ref='desc'] p")];
    }
}