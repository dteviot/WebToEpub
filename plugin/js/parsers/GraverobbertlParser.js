"use strict";

//dead url/ parser
parserFactory.register("graverobbertl.site", () => new GraverobbertlParser());

class GraverobbertlParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.post-entry ul a")]
            .filter(a => a.host !== "graverobbertl.wordpress.com");
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.post-entry");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.wp-block-column");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.post-header h1");
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(dom);

        // if only a couple of chapters, and there's a link, with "click me", chase the link
        let paragraphCount = [...content.querySelectorAll("p")].length;
        let links = [...content.querySelectorAll("a")]
            .filter(a => (a.host === "graverobbertl.site") && 
                a.textContent.toLowerCase().includes("click here"));
        if ((paragraphCount < 20) && (0 < links.length)) {
            dom = (await HttpClient.wrapFetch(links[0].href)).responseXML;
        }
        return dom;
    }

    getInformationEpubItemChildNodes(dom) {
        let children = dom.querySelector("div.post-entry").children;
        let filtered = [];
        for (let i = 0; i < children.length; ++i) {
            let e = children[i];
            if (e.tagName === "P") {
                filtered.push(e);
            }
            if (e.tagName === "H2" || e.tagName === "UL") {
                break;
            }
        }
        return filtered;
    }
}
