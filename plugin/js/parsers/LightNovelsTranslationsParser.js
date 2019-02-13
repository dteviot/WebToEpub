"use strict";

parserFactory.register("lightnovelstranslations.com", function() { return new LightNovelsTranslationsParser() });

class LightNovelsTranslationsParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    fetchChapter(url) {
        let that = this;
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let dom = xhr.responseXML
            that.strpElementsThatMessUpLinkReplacement(dom);
            let candidates = that.findLinksToReplace(url, dom);
            return that.replaceHyperlinksWithImages(url, dom, candidates, 0);
        });
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
        let nodes = [...dom.querySelectorAll("div.entry-content > p")]
            .map(n => n.cloneNode(true));
        for(let n of nodes) {
            util.removeElements(n.querySelectorAll("img"));
        }
        return nodes;
    }
}
