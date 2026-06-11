/*
  Parses files on wikipedia.org
*/
"use strict";

parserFactory.registerUrlRule(
    url => util.extractHostName(url).endsWith(".wikipedia.org"), 
    () => new WikipediaParser()
);

parserFactory.registerManualSelect(
    "Wikipedia", 
    () => new WikipediaParser()
);

class WikipediaParser extends Parser {
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
    }

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.getElementById("bodyContent");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        this.removeEditElements(element);
        this.removeExternalLinkTables(element);
        this.removeExternalHyperlinks(element);
    }

    removeEditElements(element) {
        util.removeElements(element.querySelectorAll("span.mw-editsection"));
    }

    removeExternalLinkTables(element) {
        util.removeElements(element.querySelectorAll("div.navbox"));
    }

    removeExternalHyperlinks(element) {
        for (let a of util.getElements(element, "a", e => !this.isLinkToKeep(e))) {
            this.replaceHyperlinkWithTextContent(a);
        }
    }
    
    isLinkToKeep(hyperlink) {
        return !util.isNullOrEmpty(hyperlink.hash) ||
            (hyperlink.querySelector("img, image") !== null);
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
