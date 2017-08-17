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
            let table = xhr.responseXML.querySelector("table#chapters");
            return util.hyperlinksToChapterList(table);
        });
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", 
            e => (e.className === "portlet-body") &&
            (e.querySelector("div.chapter-inner") !== null)
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
        util.removeElements(content.querySelectorAll("a[href*='www.royalroadl.com']"));
        RoyalRoadParser.removeOlderChapterNavJunk(content);
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
        let author = dom.querySelector("h4[property='author']");
        if (author === null) {
            return super.extractAuthor(dom);
        }
        author = author.innerText.trim();
        return author.startsWith("by ") ? author.substring(3) : author;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1") ||
            dom.querySelector("h2");
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
            img = dom.querySelector("img.img-offset");
        };
        return (img === null) ? img : img.src;   
    }
}
