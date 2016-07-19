/*
  Parses files on www.royalroadl.com
*/
"use strict";

class RoyalRoadParser extends Parser{
    constructor() {
        super();
    }
}

parserFactory.register("royalroadl.com", function() { return new RoyalRoadParser() });

RoyalRoadParser.prototype.getChapterUrls = function (dom) {
    let that = this;
    return Promise.resolve(that.getElements(dom, "li", e => (e.className === "chapter")).map(element => that.elementToChapterInfo(element)));
};

RoyalRoadParser.prototype.elementToChapterInfo = function (chapterElement) {
    let chapterHref = util.getElement(chapterElement, "a");
    return {
        sourceUrl:  chapterHref.href,
        title: chapterHref.getAttribute("title")
    };
};

// find the node(s) holding the story content
RoyalRoadParser.prototype.findContent = function (dom) {
    let that = this;
    let content = util.getElement(dom, "div", e => (e.className === "post_body scaleimages") );
    that.removeUnwantedElementsFromContent(dom, content);
    that.addTitleToContent(dom, content);
    return content;
};

RoyalRoadParser.prototype.removeUnwantedElementsFromContent = function(dom, content) {
    let that = this;
    that.removeNavigationBox(content);
    that.stripStyle(content);

    // get rid of donation request at end of chapters
    util.removeElements(util.getElements(content, "div", e => e.className === "thead"));

    // remove links to get rid of the "Read this chapter using beta fiction reader"
    util.removeElements(util.getElements(content, "a"));
    that.removeOlderChapterNavJunk(dom, content);
    util.removeEmptyDivElements(content);
    that.removeTrailingWhiteSpace(content);
}

RoyalRoadParser.prototype.removeNavigationBox = function (element) {
    let navigationBox = this.findNavigationBox(element);
    if (navigationBox !== null) {
        util.removeNode(navigationBox);
    }
};

RoyalRoadParser.prototype.findNavigationBox = function (element) {
    for(let navigationBox of util.getElements(element, "div", e => (e.className === "post-content"))) {
        let navLinks = util.getElements(navigationBox, "a", e2 => (e2.className === "chapterNav"));
        if (0 < navLinks.length) {
            return navigationBox;
        }
    }
    return null;
}

RoyalRoadParser.prototype.stripStyle = function (element) {
    let walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    do {
        walker.currentNode.removeAttribute("style");
    } while(walker.nextNode());
};

RoyalRoadParser.prototype.extractTextFromPage = function(dom, tagName, filter) {
    let element = util.getElement(dom, tagName, filter);
    return (element === null) ? "<unknown>" : element.innerText.trim();
};

RoyalRoadParser.prototype.extractTitle = function(dom) {
    return this.extractTextFromPage(dom, "h1", e=> (e.className === "fiction-title"));
};

RoyalRoadParser.prototype.extractAuthor = function(dom) {
    let author = this.extractTextFromPage(dom, "span", e=> (e.className === "author"));
    return author.startsWith("by ") ? author.substring(3) : author;
};

RoyalRoadParser.prototype.addTitleToContent = function(dom, content) {
    let that = this;
    let titleText = that.findChapterTitle(dom);
    if (titleText !== "") {
        let title = dom.createElement("h3");
        title.appendChild(dom.createTextNode(titleText));
        content.insertBefore(title, content.firstChild);
    };
}

RoyalRoadParser.prototype.findChapterTitle = function(dom) {
    let title = util.getElement(dom, "div", e => (e.className === "ccgtheadposttitle"));
    return (title === null) ? "" : title.innerText.trim();
}

RoyalRoadParser.prototype.removeOlderChapterNavJunk = function(dom, content) {
    // some older chapters have next chapter & previous chapter links seperated by string "<-->"
    let walker = dom.createTreeWalker(content, NodeFilter.SHOW_TEXT, 
        n => (n.textContent.trim() === "<-->"), 
        false
    );
    let node = null;
    while (node = walker.nextNode()) {
        util.removeNode(node);
    };
}

RoyalRoadParser.prototype.removeTrailingWhiteSpace = function (content) {
    let children = content.childNodes;
    while ((0 < children.length) && util.isElementWhiteSpace(children[children.length - 1])) {
        util.removeNode(children[children.length - 1]);
    }
}

