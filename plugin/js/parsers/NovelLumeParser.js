"use strict";

parserFactory.register("novellume.com", () => new NovelLumeParser());

/**
 * Parser for NovelLume
 * @property { Number } minimumThrottle - Minimum delay (in ms) between page requests. Useful for 403 error prevention. If the sites this parser accesses throttles requests or uses cloudflare, it is recommended to set this.
 */
class NovelLumeParser extends Parser {

    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    /**
     * Returns promise with the URLs of the chapters to fetch
     * Promise is used because may need to fetch the list of URLs from internet
     *
     * @param { Document } dom
     * @returns { Promise }
     */
    async getChapterUrls(dom, chapterUrlsUI) { // eslint-disable-line no-unused-vars
        let chapters = dom.querySelector("div.panel-body div.chapter-archive-grid").querySelectorAll("a");

        return [...chapters].map((a) => {
            return {
                sourceUrl: a.href,
                title: a.title.trim(),
                newArc: null,
            };
        });
    }

    /**
     * Returns the element holding the story content in a chapter
     * @param { Document } dom
     * @returns { HTMLElement }
     */
    findContent(dom) {
        return dom.querySelector("div#chr-content.chr-c");
    }

    /**
     * Title of the story (not to be confused with title of each chapter)
     *
     * Note: Typical implementation is find node with the Title and return name from title
     * @param { Document } dom
     * @returns { string | HTMLElement }
     */
    extractTitleImpl(dom) {
        return dom.querySelector("h3.title").textContent.trim();
    }

    /**
     * Helper function for single point of maintenance.
     * @param { Document } dom
     * @param { string } filterString
     * @returns { Array<Node> | undefined }
     */
    extractMetadataList(dom, filterString) {
        let liElement = [...dom.querySelector("ul.info.info-meta").children].find((node) => {
            return node.firstElementChild.textContent.toLowerCase() === filterString;
        });

        if (liElement === undefined) {
            return undefined;
        }

        return [...liElement.children];
    }

    /**
     * author of the story
     * @param { Document } dom
     * @returns { string }
     */
    extractAuthor(dom) {
        let authorName = this.extractMetadataList(dom, "author:")?.find((node) => {
            return node.tagName === "A";
        }).textContent;
        return authorName.trim();
    }

    /**
     * Genere of the story
     * @param { Document } dom
     * @returns
     */
    extractSubject(dom) {
        let tagList = this.extractMetadataList(dom, "genre:")
            .filter((node) => {
                return node.tagName == "A";
            })
            .map((node) => {
                return node.textContent;
            });

        return tagList.join(", ");
    }

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    extractLanguage(dom) { // eslint-disable-line no-unused-vars
        return "en";
    }


    /**
     *
     * Description of the story
     * @param { Document } dom
     * @returns { HTMLElement }
     */
    extractDescription(dom) {
        let descriptionElement = dom.querySelector("div#novel-description-content.desc-text");
        let descriptionParagraphs = [...descriptionElement.querySelectorAll("p")];
        return descriptionParagraphs
            .map((paragraph) => {
                return paragraph.textContent.trim();
            })
            .join("\n\n");
    }

    /**
     *  Publisher of the story
     * @param { Document } dom
     * @returns { HTMLElement | string }
     */
    extractPublisher(dom) { // eslint-disable-line no-unused-vars

        return "NovelLume";
    }


    // Optional, supply if need to do custom cleanup of content
    /*
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }
    */

    /**
     * @param { Document } dom
     * @returns { HTMLElement | string }
     */
    findChapterTitle(dom) {
        return dom.querySelector("span.chr-text").textContent.trim();
    }


    /**
     *
     * @param { Document } dom
     * @returns
     */
    findCoverImageUrl(dom) {
        return dom.querySelector("img.novel-cover-loading").getAttribute("src");
    }

}
