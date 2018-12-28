"use strict";

parserFactory.register("comrademao.com", function() { return new ComrademaoParser() });

class ComrademaoParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false; 
    }
  
    customRawDomToContentStep(chapter, content) {
        for(let s of content.querySelectorAll("div.collapse")) {
            if (this.userPreferences.removeOriginal.value) {
                s.remove();
            } else {
                let p = s.querySelector("p");
                s.replaceWith(p);
            }
        } 
    }

    getChapterUrls(dom) {
        let chapters = ComrademaoParser.extractPartialChapterList(dom);
        let pagesWithToc = ComrademaoParser.listUrlsHoldingChapterLists(dom);
        if (pagesWithToc.length <= 1) {
            return Promise.resolve(chapters.reverse());
        }

        // Disabled fetching ToC pages, is timing out at moment.
        return Promise.resolve(chapters.reverse());
/*        
        return Promise.all(
            pagesWithToc.map(volume => ComrademaoParser.fetchPartialChapterList(volume))
        ).then(function (tocFragments) {
            for (let fragment of tocFragments) {
                chapters = chapters.concat(fragment);
            }
            return Promise.resolve(chapters.reverse());
        });
*/        
    };

    static listUrlsHoldingChapterLists(dom) {
        let urls = [ dom.baseURI ];
        let nav = dom.querySelector("div.content nav");
        if (nav != null) {
            let links = [...nav.querySelectorAll("a.page-numbers")]
                .filter(l => !l.className.includes("next"));
            let max = (0 < links.length) 
                ? parseInt(links[links.length - 1].textContent)
                : 0;
            for(let i = 2; i <= max; ++i) {
                let url = `${dom.baseURI}page/${i}/`;
                urls.push(url);
            }
        }
        return urls;
    }

    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return ComrademaoParser.extractPartialChapterList(xhr.responseXML);
        });
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("table.table");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.page-title-product_2 div.wrap-content h4");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    removeUnwantedElementsFromContentElement(element) {
        for(let button of element.querySelectorAll("button")) {
            button.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.page-title-product_2");
    }

    getInformationEpubItemChildNodes(dom) {
        let infoNodes = [...dom.querySelectorAll("div.page-title-product_2 div.wrap-content, div.info-single-product")];
        for(let e of infoNodes) {
            for(let i of e.querySelectorAll("img")) {
                i.remove();
            }
        }
        return infoNodes;
    }
}
