"use strict";

//dead url/ parser
parserFactory.register("kobatochan.com", () => new KobatochanParser());

class KobatochanParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then((xhr) => {
            let newDom = xhr.responseXML;
            let extraPageUrls = KobatochanParser.findAdditionalPageUrls(newDom);
            KobatochanParser.removePaginationElements(newDom);
            return this.fetchAdditionalPages(newDom, extraPageUrls.reverse());
        });
    }

    static findAdditionalPageUrls(dom) {
        let pages = [];
        for (let a of dom.querySelectorAll("div.pgntn-page-pagination-block a")) {
            if (!pages.includes(a.href)) {
                pages.push(a.href);
            }
        }
        return pages;
    }

    fetchAdditionalPages(dom, extraPageUrls) {
        if (extraPageUrls.length === 0) {
            return Promise.resolve(dom);
        }
        return HttpClient.wrapFetch(extraPageUrls.pop()).then((xhr) => {
            let newDom = xhr.responseXML;
            KobatochanParser.removePaginationElements(newDom);
            let dest = this.findContent(dom);
            let src = this.findContent(newDom);
            for (let node of [...src.childNodes]) {
                dest.appendChild(node);
            }
            return this.fetchAdditionalPages(dom, extraPageUrls);
        });
    }

    static removePaginationElements(dom) {
        return util.removeChildElementsMatchingSelector(dom, "div.page-link, div.pgntn-multipage, div.g-dyn");
    }
}
