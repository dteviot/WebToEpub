/*
  Parser used when can't match a parser for the document
*/
"use strict";

class DefaultParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let body = util.getElement(dom, "body");
        return Promise.resolve(util.hyperlinksToChapterList(body));
    }

    findContent(dom) {
        let tag = DefaultParser.getSelectContentTag().value;
        let idType = DefaultParser.getSelectContentTagIdType().value;
        let search = DefaultParser.getContentTagIdentifierInput().value.trim();
        let predicate = function(element) { return true; }    // eslint-disable-line no-unused-vars
        if (tag !== "body") {
            switch(idType) {
            case "classIs": 
                predicate = (e => (e.className === search));
                break;
            case "classStartsWith": 
                predicate = (e => e.className.startsWith(search));
                break;
            case "idIs": 
                predicate = (e => (e.id === search)); 
                break;
            case "idStartsWith": 
                predicate = (e => e.id.startsWith(search));
                break;
            }
        }
        return util.getElement(dom, tag, predicate); 
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
        document.getElementById("defaultParserSection").hidden = false;
        window.showErrorMessage(chrome.i18n.getMessage("noParserFound"));
    }

    // override default (keep nearly everything, may be wanted)
    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(util.getElements(element, "script", e => e.getAttribute("src") != null));
        util.removeElements(util.getElements(element, "iframe"));
        util.removeComments(element);
        util.removeUnwantedWordpressElements(element);
    };

    static getSelectContentTag() {
        return document.getElementById("selectContentTag");
    }

    static getSelectContentTagIdType() {
        return document.getElementById("selectContentTagIdType");
    }

    static getContentTagIdentifierInput() {
        return document.getElementById("contentTagIdentifierInput");
    }
}
