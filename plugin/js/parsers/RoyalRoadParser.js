/*
  Parses files on www.royalroadl.com
*/
"use strict";

parserFactory.register("royalroadl.com", function() { return new RoyalRoadParser() });

class RoyalRoadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let table = util.getElement(dom, "table", e => e.id === "chapters");
        let chapters = [];
        if (table !== null) {
            chapters = util.hyperlinksToChapterList(table);
        }
        return Promise.resolve(chapters);
    }

    elementToChapterInfo(chapterElement) {
        let chapterHref = util.getElement(chapterElement, "a");
        return {
            sourceUrl:  chapterHref.href,
            title: chapterHref.getAttribute("title")
        };
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let content = util.getElement(dom, "div", e => (e.className === "portlet-body"));
        return content;
    }

    customRawDomToContentStep(chapter, content) {
        this.addTitleToContent(chapter.rawDom, content);
    }

    removeUnwantedElementsFromContentElement(content) {
        let that = this;
        that.removeOlderChapterNavJunk(content);

        // only keep the <div class="chapter-inner" elements of content
        for(let i = content.childElementCount - 1; 0 <= i; --i) {
            let child = content.children[i];
            let tagName = child.tagName.toLowerCase();
            if ((tagName !== "h1") && ((tagName !== "div") || !child.className.startsWith("chapter-inner"))) {
                util.removeNode(child);
            }
        }

        super.removeUnwantedElementsFromContentElement(content);
    }

    extractTextFromPage(dom, tagName, filter) {
        let element = util.getElement(dom, tagName, filter);
        return (element === null) ? "<unknown>" : element.innerText.trim();
    }

    extractTitle(dom) {
        return this.extractTextFromPage(dom, "h2", e=> (e.getAttribute("property") === "name"));
    }

    extractAuthor(dom) {
        let author = this.extractTextFromPage(dom, "h4", e=> (e.getAttribute("property") === "author"));
        return author.startsWith("by ") ? author.substring(3) : author;
    }

    addTitleToContent(dom, content) {
        let that = this;
        let titleText = that.findChapterTitle(dom);
        if (titleText !== "") {
            let title = dom.createElement("h1");
            title.appendChild(dom.createTextNode(titleText));
            content.insertBefore(title, content.firstChild);
        };
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "h2"); 
        return (title === null) ? dom.title : title.innerText.trim();
    }

    removeOlderChapterNavJunk(content) {
        // some older chapters have next chapter & previous chapter links seperated by string "<-->"
        let walker = content.ownerDocument.createTreeWalker(content, NodeFilter.SHOW_TEXT, 
            n => (n.textContent.trim() === "<-->"), 
            false
        );
        let node = null;
        while ((node = walker.nextNode())) {
            util.removeNode(node);
        };
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        if (dom != null) {
            let cover = util.getElement(dom, "img", e => e.className.startsWith("img-offset"));
            if (cover !== null) {
                return cover.src;
            };
        };
        return null;
    }
}
