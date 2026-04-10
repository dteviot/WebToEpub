"use strict";

parserFactory.register("101kks.com", () => new _101kksParser());

class _101kksParser extends Parser {
    constructor() {
        super();
    }

    setRefererOnWebRequests = (() => {
        let done = false;

        return async () => {
            if (done)
                return;

            done = true;

            /**
             * Site requires a valid user agent, and a referer pointing to
             * itself to allow "ajax" requests.
             * 
             * @type { chrome.declarativeNetRequest.Rule[] }
             */
            const fetchRules = [
                {
                    "id": 1,
                    "priority": 1,
                    "condition": {
                        "urlFilter": "101kks.com",
                    },
                    "action": {
                        "type": "modifyHeaders",
                        "requestHeaders": [
                            {
                                "header": "Referer",
                                "operation": "set",
                                "value": "https://101kks.com/"
                            },
                        ]
                    }
                }
            ];

            await HttpClient.setDeclarativeNetRequestRules(fetchRules);
        };
    })();

    /**
     * @param { string } id 
     * @returns { Promise<Document> }
     * @private
     */
    async getChapterLinksDom(id) {
        await this.setRefererOnWebRequests();
    
        return (await HttpClient.wrapFetch(
            `https://101kks.com/ajax_novels/chapterlist/${id}.html`,
        ))?.responseXML;
    }

    /**
     * @override
     * @param { Document} dom 
     */
    async getChapterUrls(dom) {
        const id = /(?<id>\d+)\./.exec(dom.baseURI)?.groups?.["id"];

        if (!id)
            return null;

        /** @type { NodeListOf<HTMLAnchorElement> } */
        const anchors = (await this.getChapterLinksDom(id)).querySelectorAll("a");

        return Array.from(anchors, anchor => util.hyperLinkToChapter(anchor));
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector("#txtcontent");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findChapterTitle(dom) {
        return dom.querySelector(".txtnav > h1");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        return dom.querySelector("div.booknav2 > p a[href*='author']")?.textContent.trim() ?? super.extractAuthor();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractSubject(dom) {
        return dom.querySelector("div.booknav2 > p a[href*='class']")?.textContent.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractDescription(dom) {
        return dom.querySelector("div.navtxt > p")?.textContent.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        // Most common implementation is get first image in specified container. e.g. 
        return util.getFirstImgSrc(dom, "div.bookimg2");
    }
}