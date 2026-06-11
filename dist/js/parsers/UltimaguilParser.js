/*
  Parses www.ultimaguil.org
*/
"use strict";

//dead url/ parser
parserFactory.register("ultimaguil.org", () => new UltimaguilParser(new VariableSizeImageCollector()));

class UltimaguilParser extends Parser {
    constructor(imageCollector) {
        super(imageCollector);
    }

    getChapterUrls(dom) {
        return Promise.resolve(util.hyperlinksToChapterList(dom));
    }

    extractTitleImpl(dom) {   // eslint-disable-line no-unused-vars
        return "Twintails";
    }

    extractAuthor(dom) {   // eslint-disable-line no-unused-vars
        return "Mizusawa Yume";
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let div = dom.querySelector("div#inside");
        return div;
    }

    populateUIImpl() {
        document.getElementById("highestResolutionImagesRow").hidden = false;
    }

    webPageToEpubItems(webPage, epubItemIndex) {
        let content = this.convertRawDomToContent(webPage);
        let items = [];
        if (content != null) {
            items = this.splitContentIntoEpubItems(content, webPage.sourceUrl, epubItemIndex);
        }
        return items;
    }

    splitContentIntoEpubItems(content, baseUri, epubItemIndex) {
        this.convertMidpartToHeaders(content);
        let items = BakaTsukiParser.splitContentOnHeadingTags(content);
        return BakaTsukiParser.itemsToEpubItems(items, epubItemIndex, baseUri);
    }

    convertMidpartToHeaders(content) {
        let doc = content.ownerDocument;
        for (let midpart of content.querySelectorAll("div.part.midpart.gear")) {
            let parent = midpart.parentElement;
            let h3 = doc.createElement("h2");
            let link = midpart.querySelector("a");
            h3.appendChild(doc.createTextNode(link.getAttribute("title")));
            parent.replaceWith(h3);
        }
    }

    customRawDomToContentStep(chapter, content) {
        this.flattenContent(content);
        this.removeLinkFromHeaders(content);
    }

    /**
     *  "flatten" content.  Chapter parts may be <div> sections after the read_content span
    */
    flattenContent(content) {
        let read_content = content.querySelector("span#read_content");
        if (read_content !== null) {
            let parent = read_content.parentElement;
            while (read_content.hasChildNodes()) {
                let node = read_content.childNodes[0];
                if (node.tagName.toLowerCase() === "div") {
                    let div = node;
                    while (div.hasChildNodes()) {
                        parent.insertBefore(div.childNodes[0], read_content);
                    }
                    div.remove();
                } else {
                    parent.insertBefore(node, read_content);
                }
            }
        }
    }

    removeLinkFromHeaders(content) {
        let document = content.ownerDocument;
        for (let link of content.querySelectorAll("h2 a")) {
            link.replaceWith(document.createTextNode(link.textContent));
        }
    }
}
