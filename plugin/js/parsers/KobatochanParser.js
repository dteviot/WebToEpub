"use strict";

//dead url/ parser
parserFactory.register("kobatochan.com", function () { return new KobatochanParser() });

class KobatochanParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    fetchChapter(url) {
        let that = this;
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let newDom = xhr.responseXML;
            let extraPageUrls = KobatochanParser.findAdditionalPageUrls(newDom);
            KobatochanParser.removePaginationElements(newDom);
            return that.fetchAdditionalPages(newDom, extraPageUrls.reverse());
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
        let that = this;
        if (extraPageUrls.length === 0) {
            return Promise.resolve(dom);
        }
        return HttpClient.wrapFetch(extraPageUrls.pop()).then(function (xhr) {
            let newDom = xhr.responseXML;
            KobatochanParser.removePaginationElements(newDom);
            let dest = that.findContent(dom);
            let src = that.findContent(newDom);
            for (let node of [...src.childNodes]) {
                dest.appendChild(node);
            }
            return that.fetchAdditionalPages(dom, extraPageUrls);
        });
    }

    static removePaginationElements(dom) {
        return util.removeChildElementsMatchingCss(dom, "div.page-link, div.pgntn-multipage, div.g-dyn");
    }
}
