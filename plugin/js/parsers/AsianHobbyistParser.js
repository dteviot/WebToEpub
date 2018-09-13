"use strict";

parserFactory.register("asianhobbyist.com", () => new AsianHobbyistParser());

class AsianHobbyistParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("li.su-post a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(items.reverse());
    };

    static findUrlOfFirstPageOfChapter(dom) {
        let link = dom.querySelector("div.entry-content div.post-embed blockquote a");
        if (link != null) {
            return link.href;
        }

        let content = AsianHobbyistParser.cleanedContent(dom);
        let links = [...content.querySelectorAll("a")];
        if (0 < links.length) {
            return links.pop().href;
        }

        links = [...content.querySelectorAll("p")]
            .map(p => p.textContent)
            .filter(util.isUrl);
        if (0 < links.length) {
            return links.pop();
        }

        return null;
    }

    static cleanedContent(dom) {
        let toClean = dom.querySelector("div.entry-content");
        for(let e of toClean.querySelectorAll("div.code-block, div.nnl_container, div.osny-nightmode")) {
            e.remove();
        }
        return toClean;
    }

    fetchChapter(url) {
        let firstUrl = url;
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let docToFill = Parser.makeEmptyDocForContent("");
            let newDom = xhr.responseXML;
            let pageUrl = AsianHobbyistParser.findUrlOfFirstPageOfChapter(newDom);
            return AsianHobbyistParser.fetchPagesOfChapter(
                (pageUrl === null) ? firstUrl : pageUrl, docToFill
            );
        });
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    static fetchPagesOfChapter(pageUrl, docToFill) {
        return HttpClient.wrapFetch(pageUrl).then(function (xhr) {
            let newDom = xhr.responseXML;
            let content = AsianHobbyistParser.extractContent(newDom);
            let nextPageUrl = AsianHobbyistParser.findNextPageUrl(newDom);
            docToFill.content.appendChild(content);
            if (nextPageUrl === null) {
                return Promise.resolve(docToFill.dom);
            } else {
                AsianHobbyistParser.removeNextPageHyperlink(content, nextPageUrl);
                return AsianHobbyistParser.fetchPagesOfChapter(nextPageUrl, docToFill);
            }
        });
    }

    static extractContent(dom) {
        if (AsianHobbyistParser.isPaged(dom)) {
            return dom.querySelector("div#acp_content");
        }
        return AsianHobbyistParser.cleanedContent(dom);
    }

    static isPaged(dom) {
        return dom.querySelector("div.acp_wrapper") != null;
    }

    static findNextPageUrl(dom) {
        let link = dom.querySelector("li.acp_next_page a");
        if ((link != null) && (link.parentNode.style.display === "")) {
            return link.href;
        }
        return null;
    }
    
    static removeNextPageHyperlink(content, url) {
        let checkUrl = util.normalizeUrlForCompare(url);
        [...content.querySelectorAll("a")]
            .filter(a => util.normalizeUrlForCompare(a.href) === checkUrl)
            .forEach(a => a.remove());
    }
}
