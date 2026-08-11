"use strict";

parserFactory.register("sammyandpassion.com", () => new SammyAndPassionParser());

class SammyAndPassionParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.wp-block-heading");
    }

    extractAuthor(dom) {
        let authorParagraph = [...dom.querySelectorAll("p")]
            .find((p) => p.textContent.includes("Author:"));
        if (!authorParagraph) {
            return super.extractAuthor(dom);
        }
        let firstLine = authorParagraph.innerHTML.split(/<br\s*\/?>/i)[0];
        let text = firstLine.replace(/<[^>]+>/g, "");
        return text.replace(/.*Author:\s*/, "").trim();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure.wp-block-image");
    }

    getChapterUrls(dom) {
        let excludedLabels = ["first chapter", "last chapter", "let's go", "lets go"];
        let linkSet = new Set();

        let links = dom.querySelectorAll(".wp-block-buttons a.wp-block-button__link, .wp-block-button a.wp-block-button__link");

        return [...links]
            .filter((link) => {
                if (!link.href.startsWith("https://sammyandpassion.com/")) {
                    return false;
                }
                let text = link.textContent.trim().toLowerCase();
                if (excludedLabels.includes(text)) {
                    return false;
                }
                let normalizedHref = util.normalizeUrlForCompare(link.href);
                if (linkSet.has(normalizedHref)) {
                    return false;
                }
                linkSet.add(normalizedHref);
                return true;
            })
            .map((link) => ({
                sourceUrl: link.href,
                title: link.textContent.trim()
            }));
    }

    findContent(dom) {
        let content = dom.querySelector("div.entry-content");
        if (content) {
            this.convertBackgroundImagesToImgTags(content);
        }
        return content;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".wp-block-buttons");
        super.removeUnwantedElementsFromContentElement(element);
    }

    convertBackgroundImagesToImgTags(element) {
        let backgroundDivs = element.querySelectorAll(".wp-block-cover__image-background");
        backgroundDivs.forEach((div) => {
            let match = (div.getAttribute("style") || "").match(/background-image:\s*url\(([^)]+)\)/);
            if (match) {
                let img = div.ownerDocument.createElement("img");
                img.src = match[1].replace(/^["']|["']$/g, "");
                div.replaceWith(img);
            }
        });
    }
}