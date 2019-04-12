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
        let chapters = ComrademaoParser.chaptersFromDom(dom);
        let ajaxUrl = ComrademaoParser.getUrlforTocAjaxCall(dom);
        if (ajaxUrl === null) {
            return Promise.resolve(chapters);
        }
        return HttpClient.fetchJson(ajaxUrl)
            .then(function (handler) {
                return ComrademaoParser.makeChapterUrlsFromAjaxResponse(handler.json);
            })
            .catch(function () {
                return chapters;
            });
    };

    static chaptersFromDom(dom) {
        let menu = dom.querySelector("table#chapters");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    static getUrlforTocAjaxCall(dom) {
        let link = dom.querySelector("link[rel='shortlink']");
        if (link !== null) {
            let id = link.getAttribute("href").split("?p=")[1];
            if (!util.isNullOrEmpty(id)) {
                return `https://comrademao.com/wp-admin/admin-ajax.php?action=movie_datatables&start=0&length=10000&p2m=${id}`;
            }
        }
        return null;
    }

    static makeChapterUrlsFromAjaxResponse(json) {
        let parser = new DOMParser();
        return json.data
            .map(a => ComrademaoParser.stringToChapter(a[1], parser))
            .reverse();
    }

    static stringToChapter(s, parser) {
        let link = parser.parseFromString(s, "text/html").body.childNodes[0];
        return util.hyperLinkToChapter(link) ;
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
        util.removeChildElementsMatchingCss(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        let text = this.makeChapterTitleTextFromUrl(dom.baseURI)
        let title = dom.createElement("h1");
        title.appendChild(dom.createTextNode(text));
        return title;
    }

    makeChapterTitleTextFromUrl(url) {
        let leaf = url
            .split("/")
            .filter(s => !util.isNullOrEmpty(s))
            .reverse()[0];
        let words = leaf
            .split("-")
            .map(this.capitalizeWord)
            .join(" ");
        return words;
    }

    capitalizeWord(word) {
        return word.toUpperCase()[0] + word.substring(1);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.page-title-product_2");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.page-title-product_2 div.wrap-content, div.info-single-product")];
    }
}
