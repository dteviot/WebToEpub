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
        if (ComrademaoParser.allChaptersPresent(chapters)) {
            return Promise.resolve(chapters);
        }
        let wrapOptions = {
            method: "POST",
            credentials: "include",
            body: ComrademaoParser.fakeFormData(dom)
        };
        return HttpClient.fetchJson(ComrademaoParser.getUrlforTocAjaxCall(dom), wrapOptions)
            .then(function (handler) {
                return ComrademaoParser.makeChapterUrlsFromAjaxResponse(handler.json);
            })
            .catch(function () {
                return ComrademaoParser.chaptersFromDom(dom);
            });
    }

    static chaptersFromDom(dom) {
        let menu = dom.querySelector("table#table_1");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    static allChaptersPresent(chapters) {
        return 100 < chapters.length;
    }
    
    static getUrlforTocAjaxCall(dom) {
        let link = dom.querySelector("link[rel='shortlink']");
        let id = link.getAttribute("href").split("?p=")[1];
        return `https://comrademao.com/wp-admin/admin-ajax.php?action=get_wdtable&table_id=3&wdt_var1=${id}`;
    }

    static fakeFormData(dom) {
        const askForAllChapters = -1;
        var formData = new FormData();
        formData.append("draw", 1);
        formData.append("columns[0][data]", 0);
        formData.append("columns[0][name]", "post_post_date");
        formData.append("columns[0][searchable]", true);
        formData.append("columns[0][orderable]", true);
        formData.append("columns[0][search][value]", ""); 
        formData.append("columns[0][search][regex]", false);
        formData.append("columns[1][data]", 1);
        formData.append("columns[1][name]", "post_title_with_link_to_post");
        formData.append("columns[1][searchable]", true);
        formData.append("columns[1][orderable]", true);
        formData.append("columns[1][search][value]", "");
        formData.append("columns[1][search][regex]", false);
        formData.append("columns[2][data]", 2);
        formData.append("columns[2][name]", "post_meta_p2m");
        formData.append("columns[2][searchable]", true);
        formData.append("columns[2][orderable]", true);
        formData.append("columns[2][search][value]", "");
        formData.append("columns[2][search][regex]", false);
        formData.append("order[0][column]", 0);
        formData.append("order[0][dir]", "desc");
        formData.append("start", 0);
        formData.append("length", askForAllChapters);
        formData.append("search[value]", "");
        formData.append("search[regex]", false);
        formData.append("wdtNonce", ComrademaoParser.getWdtnonce(dom));
        return formData;
    }

    static getWdtnonce(dom) {
        return dom.querySelector("input#wdtNonceFrontendEdit")
            .getAttribute("value");
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
        let entry = dom.querySelector("div.entry-content");
        let main = entry.querySelector("main#main");
        return (main == null) ? entry : main; 
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
