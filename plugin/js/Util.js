/*
    General dumping ground for misc functions that I can't find a better place for.
    Warning: Don't look at this too closely, or you may loose your sanity.
    Side Note: Putting these all in one place may not have been a good idea. 
    I think they're breeding. There seem to be more functions in here that I didn't create.
*/

"use strict";

var util = (function () {

    var createEmptyXhtmlDoc = function() {
        let doc = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "", null);
        let htmlNode = doc.createElement("html");
        doc.appendChild(htmlNode);
        let head = doc.createElement("head");
        htmlNode.appendChild(head);
        head.appendChild(doc.createElement("title"));
        let style = doc.createElement("style");
        head.appendChild(style);
        style.setAttribute("type", "text/css");
        style.appendChild(doc.createTextNode(
            "img { max-width: 100%; max-height: 100%; padding: 0; margin: 0; } " +
            "div.svg_outer { display: block; margin-bottom: 0; margin-left: 0; margin-right: 0; margin-top: 0; padding-bottom: 0; padding-left: 0; "+
                            "padding-right: 0; padding-top: 0; text-align: left } " +
            "div.svg_inner { display: block; text-align: center } "
        ));
        let body = doc.createElement("body");
        htmlNode.appendChild(body);
        return doc;
    }

    function createSvgImageElement(href, width, height, origin) {
        let that = this;
        let doc = that.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let div = doc.createElement("div");
        div.className = "svg_outer svg_inner";
        body.appendChild(div);
        var svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
        div.appendChild(svg);
        svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        svg.setAttribute("height", "100%");
        svg.setAttribute("width", "100%");
        svg.setAttribute("version", "1.1");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        let newImage = doc.createElementNS("http://www.w3.org/2000/svg","image");
        svg.appendChild(newImage);
        newImage.setAttribute("xlink:href", ".." + href.substr(5));
        newImage.setAttribute("height", height);
        newImage.setAttribute("width", width);
        newImage.setAttribute("data-origin", origin);
        return div;
    }

    var resolveRelativeUrl = function(baseUrl, relativeUrl) {
        // Assumes parent document has a <base> element
        let base = document.getElementsByTagName('base')[0];
        let oldHref = base.href;

        // this gets the browser to do the work for us
        let resolver = document.createElement('a');
        base.href = baseUrl;
        resolver.href = relativeUrl;
        let resolvedUrl = resolver.href;  

        // restore and return
        base.href = oldHref;
        return resolvedUrl;
    }

    var addToDocBody = function (dom, contentToAdd) {
        dom.getElementsByTagName("body")[0].appendChild(contentToAdd);
    }

    var removeNode = function (node) {
        if (node.parentNode != null) {
            node.parentNode.removeChild(node)
        }
    }

    // delete all nodes in the supplied array
    var removeElements = function (elements) {
        elements.forEach(e => removeNode(e));
    }

    var removeComments = function (root) {
        let walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
        
        // if we delete currentNode, call to nextNode() fails.
        let nodeList = [];
        while (walker.nextNode()) {
            nodeList.push(walker.currentNode);
        }
        removeElements(nodeList);
    }

    var addXmlDeclarationToStart = function(dom) {
        // As JavaScript doesn't support this directly, need to do a dirty hack using
        // a processing instruction
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=318086
        let declaration = dom.createProcessingInstruction("xml", "version='1.0' encoding='utf-8'");
        dom.insertBefore(declaration, dom.children[0]);
    }

    
    /**
     * Determine whether a string is entirely whitespace.
     * from https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace_in_the_DOM
     *
     * @param s    String to examine
     * @return     True if all of the text content of |nod| is whitespace,
     *             otherwise false.
     */
    var isWhiteSpace = function (s) {
        return !(/[^\t\n\r ]/.test(s));
    }

    var isHeaderTag = function(node) {
        return (node.tagName === "H1") || (node.tagName === "H2") 
            || (node.tagName === "H3") || (node.tagName === "H4")
    }

    var xmlToString = function(dom) {
        util.addXmlDeclarationToStart(dom);
        return new XMLSerializer().serializeToString(dom);
    }

    var zeroPad =  function(num) {
        let padded = "000" + num;
        padded = padded.substring(padded.length - 4, padded.length);
        return padded;
    }

    var getElements = function(dom, tagName, filter) {
        let array = Array.prototype.slice.apply(dom.getElementsByTagName(tagName));
        return (filter == undefined) ? array : array.filter(filter)
    }

    var getElement = function(dom, tagName, filter) {
        let elements = getElements(dom, tagName, filter);
        return (elements.length === 0) ? null : elements[0];
    }

    var getTitle = function (title) {
        if(title) {
            title = title.replace(/([^a-z0-9_\- ]+)/gi, '');
            return (title.length > 20 ? title.substr(0, 20) + "..." : title);
        }
        return "";
    }

    // This is for Unit Testing only
    function syncLoadSampleDoc(fileName, url) {
        let that = this;
        let xhr = new XMLHttpRequest();
        xhr.open("GET", fileName, false);
        xhr.send(null);
        let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
        new HttpClient().setBaseTag(url, dom);
        return dom;
    }

    return {
        createEmptyXhtmlDoc: createEmptyXhtmlDoc,
        createSvgImageElement: createSvgImageElement,
        resolveRelativeUrl: resolveRelativeUrl,
        addToDocBody: addToDocBody,
        removeNode: removeNode,
        removeElements: removeElements,
        removeComments: removeComments,
        addXmlDeclarationToStart: addXmlDeclarationToStart,
        getElement: getElement,
        getElements: getElements,
        getTitle: getTitle,
        isWhiteSpace: isWhiteSpace,
        isHeaderTag: isHeaderTag,
        syncLoadSampleDoc : syncLoadSampleDoc,
        xmlToString: xmlToString,
        zeroPad: zeroPad
    };
})();

