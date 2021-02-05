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
                (className.startsWith("chapter-inner")) ||
                (className.includes("author-note-portlet"))
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
        let isTitleElement = function (element) {
            let tag = element.tagName.toLowerCase();
            let isTitle = ((tag[0] === "h") && (element.getAttribute("property") === "name"));
            return isTitle ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }

        for(let e of util.iterateElements(dom.body, e => isTitleElement(e))) {
            return e;
        }
    }

    extractAuthor(dom) {
        let author = dom.querySelector("h4[property='author']");
        if (author === null) {
            return super.extractAuthor(dom);
        }
        author = author.innerText.trim();
        return author.startsWith("by ") ? author.substring(3) : author;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll('[property="genre"]')];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector('div [property="description"]').textContent.trim();
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
        let img = dom.querySelector("img.img-offset");
        return (img === null) ? img : img.src;   
    }

    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        super.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
        this.removeImgTagsWithNoSrc(webPageDom);
        if (this.userPreferences.removeAuthorNotes.value) {
            util.removeElements([...webPageDom.querySelectorAll("div.author-note-portlet")]);
        }
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
