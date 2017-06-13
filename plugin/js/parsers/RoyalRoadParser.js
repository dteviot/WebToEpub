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
        // Page in browser has links reduced to "Number of links to show"
        // Fetch new page to get all chapter links.
        return HttpClient.wrapFetch(dom.baseURI).then(function (xhr) {
            let table = util.getElement(xhr.responseXML, "table", e => e.id === "chapters");
            let chapters = [];
            if (table !== null) {
                chapters = util.hyperlinksToChapterList(table);
            }
            return chapters;
        });
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
        return util.getElement(dom, "div", 
            e => (e.className === "portlet-body") &&
            (util.getElement(e, "div", c => c.className.startsWith("chapter-inner")) !== null)
        );
    }

    removeUnwantedElementsFromContentElement(content) {
        // only keep the <div class="chapter-inner" elements of content
        for(let i = content.childElementCount - 1; 0 <= i; --i) {
            let child = content.children[i];
            let tagName = child.tagName.toLowerCase();
            if ((tagName !== "h1") && ((tagName !== "div") || !child.className.startsWith("chapter-inner"))) {
                child.remove();
            }
        }
        this.removeNextAndPreviousChapterHyperlinks(content);

        super.removeUnwantedElementsFromContentElement(content);
    }

    removeNextAndPreviousChapterHyperlinks(content) {
        util.removeElements(util.getElements(content, "a", a => a.hostname === "www.royalroadl.com"));
        RoyalRoadParser.removeOlderChapterNavJunk(content);
    }

    extractTextFromPage(dom, tagName, filter) {
        let element = util.getElement(dom, tagName, filter);
        return (element === null) ? "<unknown>" : element.innerText.trim();
    }

    extractTitle(dom) {
        let isTitleElement = function (element) {
            let tag = element.tagName.toLowerCase();
            let isTitle = ((tag[0] === "h") && (element.getAttribute("property") === "name"));
            return isTitle ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }

        for(let e of util.iterateElements(dom.body, e => isTitleElement(e))) {
            return e.innerText.trim();
        }
        return super.extractTitle(dom);
    }

    extractAuthor(dom) {
        let author = this.extractTextFromPage(dom, "h4", e=> (e.getAttribute("property") === "author"));
        return author.startsWith("by ") ? author.substring(3) : author;
    }

    addTitleToContent(chapter, content) {
        let titleText = this.findChapterTitle(chapter.rawDom);
        if (titleText !== "") {
            let title = chapter.rawDom.createElement("h1");
            title.appendChild(chapter.rawDom.createTextNode(titleText));
            content.insertBefore(title, content.firstChild);
        };
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "h2"); 
        return (title === null) ? dom.title : title.innerText.trim();
    }

    static removeOlderChapterNavJunk(content) {
        // some older chapters have next chapter & previous chapter links seperated by string "<-->"
        for(let node of util.iterateElements(content, 
            n => (n.textContent.trim() === "<-->"),
            NodeFilter.SHOW_TEXT)) {
            node.remove();
        };
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        let img = null;
        if (dom != null) {
            img = util.getElement(dom, "img", e => e.className.startsWith("img-offset"));
        };
        return (img === null) ? img : img.src;   
    }
}
