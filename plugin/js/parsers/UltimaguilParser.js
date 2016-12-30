/*
  Parses www.ultimaguil.org
*/
"use strict";

parserFactory.register("ultimaguil.org", function() { return new UltimaguilParser(new VariableSizeImageCollector()) });

class UltimaguilParser extends Parser {
    constructor(imageCollector) {
        super(imageCollector);
    }

    getChapterUrls(dom) {
        let chapters = util.hyperlinksToChapterList(dom);
        return Promise.resolve(chapters);
    }

    extractTitle(dom) {   // eslint-disable-line no-unused-vars
        return "Twintails";
    }

    extractLanguage(dom) {   // eslint-disable-line no-unused-vars
        return "en";
    };

    extractAuthor(dom) {   // eslint-disable-line no-unused-vars
        return "Mizusawa Yume";
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let div = util.getElement(dom, "div", d => d.id === "inside");
        return div;
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("higestResolutionImagesRow").hidden = false; 
        CoverImageUI.showCoverImageUrlInput(true);
    }

    chapterToEpubItems(chapter, epubItemIndex) {
        let that = this;
        let content = that.convertRawDomToContent(chapter);
        let items = [];
        if (content != null) {
            items = that.splitContentIntoSections(content, chapter.sourceUrl, epubItemIndex);
        }
        return items;
    }

    splitContentIntoSections(content, baseUri, epubItemIndex) {
        let that = this;
        that.convertMidpartToHeaders(content);
        let epubItems = BakaTsukiParser.splitContentOnHeadingTags(content, baseUri);
        BakaTsukiParser.indexEpubItems(epubItems, epubItemIndex);
        return epubItems;
    }

    convertMidpartToHeaders(content) {
        let document = content.ownerDocument;
        for(let midpart of util.getElements(content, "div", e => e.className === "part midpart gear")) {
            let parent = midpart.parentElement;
            let h3 = document.createElement("h2");
            let link = util.getElement(midpart, "a");
            h3.appendChild(document.createTextNode(link.getAttribute("title")));
            parent.replaceWith(h3);
        };
    }

    customRawDomToContentStep(chapter, content) {
        this.flattenContent(content);
        this.removeLinkFromHeaders(content);
    }

    /**
     *  "flatten" content.  Chapter parts may be <div> sections after the read_content span
    */
    flattenContent(content) {
        let read_content = util.getElement(content, "span", c => c.id === "read_content");
        if (read_content !== null) {
            let parent = read_content.parentElement;
            while (0 < read_content.childNodes.length) {
                let node = read_content.childNodes[0];
                if (node.tagName.toLowerCase() === "div") {
                    let div = node;
                    while(0 < div.childNodes.length) {
                        parent.insertBefore(div.childNodes[0], read_content);
                    };
                    util.removeNode(div);
                } else {
                    parent.insertBefore(node, read_content);
                };
            };
        };
    }

    removeLinkFromHeaders(content) {
        let document = content.ownerDocument;
        for(let header of util.getElements(content, "h2")) {
            let link = util.getElement(header, "a");
            if (link !== null) {
                header.appendChild(document.createTextNode(link.innerText));
                util.removeNode(link);
            };
        };
    }
}
