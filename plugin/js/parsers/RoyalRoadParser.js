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
        let that = this;
        return Promise.resolve(that.getElements(dom, "li", e => (e.className === "chapter")).map(element => that.elementToChapterInfo(element)));
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
        let that = this;
        let content = util.getElement(dom, "div", e => (e.className === "post_body scaleimages") );
        return content;
    }

    customRawDomToContentStep(chapter, content) {
        this.addTitleToContent(chapter.rawDom, content);
    }

    removeUnwantedElementsFromContentElement(content) {
        let that = this;
        that.removeNavigationBox(content);
        that.stripStyle(content);

        // get rid of donation request at end of chapters
        util.removeElements(util.getElements(content, "div", e => e.className === "thead"));

        // remove links to get rid of the "Read this chapter using beta fiction reader"
        util.removeElements(util.getElements(content, "a").filter(a => util.getElements(a, "img").length === 0));
        that.removeOlderChapterNavJunk(content);
        super.removeUnwantedElementsFromContentElement(content);
    }

    removeNavigationBox(element) {
        let navigationBox = this.findNavigationBox(element);
        if (navigationBox !== null) {
            util.removeNode(navigationBox);
        }
    }

    findNavigationBox(element) {
        for(let navigationBox of util.getElements(element, "div", e => (e.className === "post-content"))) {
            let navLinks = util.getElements(navigationBox, "a", e2 => (e2.className === "chapterNav"));
            if (0 < navLinks.length) {
                return navigationBox;
            }
        }
        return null;
    }

    stripStyle(element) {
        let walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        do {
            walker.currentNode.removeAttribute("style");
        } while(walker.nextNode());
    }

    extractTextFromPage(dom, tagName, filter) {
        let element = util.getElement(dom, tagName, filter);
        return (element === null) ? "<unknown>" : element.innerText.trim();
    }

    extractTitle(dom) {
        return this.extractTextFromPage(dom, "h1", e=> (e.className === "fiction-title"));
    }

    extractAuthor(dom) {
        let author = this.extractTextFromPage(dom, "span", e=> (e.className === "author"));
        return author.startsWith("by ") ? author.substring(3) : author;
    }

    addTitleToContent(dom, content) {
        let that = this;
        let titleText = that.findChapterTitle(dom);
        if (titleText !== "") {
            let title = dom.createElement("h3");
            title.appendChild(dom.createTextNode(titleText));
            content.insertBefore(title, content.firstChild);
        };
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "div", e => (e.className === "ccgtheadposttitle"));
        return (title === null) ? "" : title.innerText.trim();
    }

    removeOlderChapterNavJunk(content) {
        // some older chapters have next chapter & previous chapter links seperated by string "<-->"
        let walker = content.ownerDocument.createTreeWalker(content, NodeFilter.SHOW_TEXT, 
            n => (n.textContent.trim() === "<-->"), 
            false
        );
        let node = null;
        while (node = walker.nextNode()) {
            util.removeNode(node);
        };
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        if (dom != null) {
            let cover = util.getElement(dom, "img", e => e.className === "cover");
            if (cover !== null) {
                return cover.src;
            };
        };
        return null;
    }
}
