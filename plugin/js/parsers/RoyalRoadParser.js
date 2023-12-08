/*
  Parses files on www.royalroadl.com
*/
"use strict";

parserFactory.register("royalroadl.com", function() { return new RoyalRoadParser() });
parserFactory.register("royalroad.com", function() { return new RoyalRoadParser() });

class RoyalRoadParser extends Parser{
    constructor() {
        super();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        // Page in browser has links reduced to "Number of links to show"
        // Fetch new page to get all chapter links.
        let tocHtml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        let table = tocHtml.querySelector("table#chapters");
        return util.hyperlinksToChapterList(table);
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let content = util.getElement(dom, "div", 
            e => (e.className === "portlet-body") &&
            (e.querySelector("div.chapter-inner") !== null)
        );
        return content || dom.querySelector(".page-content-wrapper");
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    removeUnwantedElementsFromContentElement(content) {
        // only keep the <div class="chapter-inner" elements of content
        for(let i = content.childElementCount - 1; 0 <= i; --i) {
            let child = content.children[i];
            if (!this.isWantedElement(child)) {
                child.remove();
            }
        }
        this.makeHiddenElementsVisible(content);

        super.removeUnwantedElementsFromContentElement(content);
    }

    isWantedElement(element) {
        let tagName = element.tagName.toLowerCase();
        let className = element.className;
        return (tagName === "h1") || 
            ((tagName === "div") && 
                (className.startsWith("chapter-inner") ||
                className.includes("author-note-portlet") ||
                className.includes("page-content"))
            );
    }

    makeHiddenElementsVisible(content) {
        [...content.querySelectorAll("div")]
            .filter(e => (e.style.display === "none"))
            .forEach(e => e.removeAttribute("style"));
    }

    removeNextAndPreviousChapterHyperlinks(webPage, content) {
        util.removeElements(content.querySelectorAll("a[href*='www.royalroadl.com']"));
        RoyalRoadParser.removeOlderChapterNavJunk(content);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic-header div.col h1");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("div.fic-header h4 span a");
        return author?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div.fiction-info span.tags .label")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.fiction-info div.description").textContent.trim();
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

    findCoverImageUrl(dom) {
        return dom.querySelector("img.thumbnail")?.src ?? null;
    }

    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        super.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
        this.removeImgTagsWithNoSrc(webPageDom);
        this.tagAuthorNotesBySelector(webPageDom, "div.author-note-portlet");
    }

    removeImgTagsWithNoSrc(webPageDom) {
        [...webPageDom.querySelectorAll("img")]
            .filter(i => util.isNullOrEmpty(i.src))
            .forEach(i => i.remove());
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.fic-title, div.fiction-info div.portlet.row")];
    }
}
