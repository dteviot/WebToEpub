"use strict";

parserFactory.register("readthedrama.com", () => new ReadthedramaParser());

/**
 * Parser for http://readthedrama.com/.
 */
class ReadthedramaParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    /**
     * @param { Document } dom 
     */
    async getChapterUrls(dom) {
        /** @type { NodeListOf<HTMLAnchorElement> } */
        const found = dom.querySelectorAll("div.divide-y a");

        return Array.from(found, anchor => {
            return {
                sourceUrl: anchor.href,
                title: anchor.querySelector("span:first-of-type").textContent.trim()
            };
        });
    }

    /**
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector("article.chapter-text");
    }

    async fetchChapter(url) {
        let dom = await super.fetchChapter(url);
        let contentNode = this.findContent(dom);
        
        if (!contentNode) {
            let scripts = dom.querySelectorAll("script");
            for (let script of scripts) {
                let text = script.textContent.trim();
                if (text.startsWith("self.__next_f.push")) {
                    let match = text.match(/self\.__next_f\.push\((.+)\)/);
                    if (match) {
                        try {
                            let arr = JSON.parse(match[1]);
                            if (arr && arr.length > 1 && typeof arr[1] === "string") {
                                let str = arr[1];
                                // Check if it's the chapter content string
                                if (!str.match(/^[0-9a-f]+:/) && (str.includes("\n\n") || str.length > 500)) {
                                    let article = dom.createElement("article");
                                    article.className = "chapter-text";
                                    let paragraphs = str.split("\n\n");
                                    for (let p of paragraphs) {
                                        let pNode = dom.createElement("p");
                                        pNode.textContent = p.trim();
                                        article.appendChild(pNode);
                                    }
                                    dom.body.appendChild(article);
                                    break;
                                }
                            }
                        } catch (e) {
                            // ignore parsing errors and continue
                        }
                    }
                }
            }
        }
        return dom;
    }

    /**
     * @param { Document } dom 
     */
    extractDescription(dom) {
        /** @type { HTMLMetaElement } */
        return dom.querySelector("meta[property='og:description']")?.content;
    }

    /**
     * @param { Document } dom 
     */
    extractSubject(dom) {
        /** @type { NodeListOf<HTMLDivElement> } */
        const tagContainers = dom.querySelectorAll("div.text-xs.border-none");

        return Array.from(tagContainers, container => container.innerHTML.trim()).join(", ");
    }

    /**
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        /** @type { HTMLParagraphElement } */
        const found = dom.querySelector("p.mb-2");

        return /\sby\s(.*)/.exec(found.textContent.trim())?.[1]?.trim();
    }

    /**
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        /** @type { HTMLMetaElement } */
        return dom.querySelector("meta[property='og:image']")?.content;
    }
}