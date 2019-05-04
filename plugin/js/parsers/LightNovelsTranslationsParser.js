"use strict";

parserFactory.register("lightnovelstranslations.com", function() { return new LightNovelsTranslationsParser() });

class LightNovelsTranslationsParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let paginationUrl = LightNovelsTranslationsParser.getLastPaginationUrl(dom);
        if (paginationUrl === null) {
            return super.getChapterUrls(dom);
        }
        return this.getChapterUrlsFromMultipleTocPages(dom,
            LightNovelsTranslationsParser.extractPartialChapterList,
            LightNovelsTranslationsParser.getUrlsOfTocPages
        ).then(c => c.reverse());
    };

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let paginationUrl = LightNovelsTranslationsParser.getLastPaginationUrl(dom);
        let maxPage = parseInt(util.extactSubstring(paginationUrl, "/page/", "/"));
        let index = paginationUrl.indexOf("/page/") + 6;
        let prefix = paginationUrl.substring(0, index);
        for(let i = 2; i <= maxPage; ++i) {
            urls.push(prefix + i +"/");
        }
        return urls;
    }

    static getLastPaginationUrl(dom) {
        let urls = [...dom.querySelectorAll("div.pagination_container a")];
        return (0 === urls.length) ? null : urls.pop().href;
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("h2.entry-title a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    fetchChapter(url) {
        let that = this;
        return HttpClient.wrapFetch(url).then(
            xhr => this.resolveBlogEntry(xhr.responseXML)
        ).then (function (dom) {
            that.strpElementsThatMessUpLinkReplacement(dom);
            let candidates = that.findLinksToReplace(url, dom);
            return that.replaceHyperlinksWithImages(url, dom, candidates, 0);
        });
    }

    resolveBlogEntry(dom) {
        let mainLink = this.linkToRealChapter(dom);
        if (0 === mainLink.length) {
            return Promise.resolve(dom);
        } else if (1 === mainLink.length) {
            return HttpClient.wrapFetch(mainLink[0].href).then(xhr => xhr.responseXML);
        } else {
            ErrorLog.log(`${dom.baseURI} may link to multiple chapters.  Only first chapter retreived.  You probably need to replace the Table of Content entry with one for each chatper`);
            return HttpClient.wrapFetch(mainLink[0].href).then(xhr => xhr.responseXML);
        }
    }

    linkToRealChapter(dom) {
        return [...dom.querySelectorAll("div.entry-content a")]
            .filter(a => a.textContent.trim().toUpperCase().includes("CLICK HERE TO READ"));
    }

    findLinksToReplace(url, dom) {
        return [...dom.querySelectorAll("div.entry-content a")]
            .filter(link => link.href.includes("illustrations"));
    }

    replaceHyperlinksWithImages(url, dom, candidates, index) {
        if (index == candidates.length) {
            return Promise.resolve(dom);
        }

        let link = candidates[index];
        ++index;
        let that = this;
        return HttpClient.wrapFetch(link.href).then(function (xhr) {
            let img = xhr.responseXML.querySelector("div.entry-content img");
            if (img != null) {
                link.replaceWith(img);
            }
            return that.replaceHyperlinksWithImages(url, dom, candidates, index);
        });
    }

    strpElementsThatMessUpLinkReplacement(dom) {
        let unwanted = [...dom.querySelectorAll("p.alignleft a, p.alignright a, script, div.sharedaddy")];
        util.removeElements(unwanted);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content > p")];
    }
}
