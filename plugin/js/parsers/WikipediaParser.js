/*
  Parses files on wikipedia.org
*/
"use strict";

parserFactory.registerRule(
    function(url, dom) {           // eslint-disable-line no-unused-vars
        return util.extractHostName(url).endsWith(".wikipedia.org"); 
    }, 
    function() { return new WikipediaParser() }
);

parserFactory.registerManualSelect(
    "Wikipedia", 
    function() { return new WikipediaParser() }
);

class WikipediaParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        // special case, just return URL of current page
        let chapter = {
            sourceUrl:  dom.baseURI,
            title: dom.title
        };
        return Promise.resolve([chapter]);
    };

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.getElementById("bodyContent");
    };

    extractLanguage(dom) {
        return util.getElement(dom, "html").getAttribute("lang");
    };

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        this.removeEditElements(element);
        this.removeExternalLinkTables(element);
        this.removeExternalHyperlinks(element);
    }

    removeEditElements(element) {
        util.removeElements(util.getElements(element, "span", e => e.className === "mw-editsection"));
    }

    removeExternalLinkTables(element) {
        util.removeElements(util.getElements(element, "div", e => e.className.includes("navbox")));
    }

    removeExternalHyperlinks(element) {
        for(let a of util.getElements(element, "a", e => !this.isLinkToKeep(e))) {
            this.replaceHyperlinkWithTextContent(a);
        }
    }
    
    isLinkToKeep(hyperlink) {
        return !util.isNullOrEmpty(hyperlink.hash) ||
            (util.getElement(hyperlink, "img") !== null) || 
            (util.getElement(hyperlink, "imgage") !== null);
    }

    replaceHyperlinkWithTextContent(hyperlink) {
        let newText = hyperlink.textContent;
        if (util.isNullOrEmpty(newText)) {
            hyperlink.remove();
        } else {
            let textNode = hyperlink.ownerDocument.createTextNode(newText);
            hyperlink.replaceWith(textNode);
        }
    }
}
