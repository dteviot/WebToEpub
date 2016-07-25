/*
    General dumping ground for misc functions that I can't find a better place for.
    Warning: Don't look at this too closely, or you may loose your sanity.
    Side Note: Putting these all in one place may not have been a good idea. 
    I think they're breeding. There seem to be more functions in here that I didn't create.
*/

"use strict";

var util = (function () {

    var createEmptyXhtmlDoc = function() {
        let ns = "http://www.w3.org/1999/xhtml";
        let doc = document.implementation.createDocument(ns, "", null);
        util.addXhtmlDocTypeToStart(doc);
        let htmlNode = doc.createElementNS(ns, "html");
        doc.appendChild(htmlNode);
        let head = doc.createElementNS(ns, "head");
        htmlNode.appendChild(head);
        head.appendChild(doc.createElementNS(ns, "title"));
        let style = doc.createElementNS(ns, "link");
        head.appendChild(style);
        style.setAttribute("href", makeRelative.call(this, util.styleSheetFileName()));
        style.setAttribute("type", "text/css");
        style.setAttribute("rel", "stylesheet");
        let body = doc.createElementNS(ns, "body");
        htmlNode.appendChild(body);
        return doc;
    }

    var createSvgImageElement = function (href, width, height, origin, includeImageSourceUrl) {
        let xmlns = "http://www.w3.org/1999/xhtml";
        let svg_ns = "http://www.w3.org/2000/svg";
        let xlink_ns = "http://www.w3.org/1999/xlink";
        let that = this;
        let doc = that.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let div = doc.createElementNS(xmlns, "div");
        div.className = "svg_outer svg_inner";
        body.appendChild(div);
        var svg = document.createElementNS(svg_ns,"svg");
        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", xlink_ns);
        div.appendChild(svg);
        svg.setAttributeNS(null, "height", "99%");
        svg.setAttributeNS(null, "width", "100%");
        svg.setAttributeNS(null, "version", "1.1");
        svg.setAttributeNS(null, "preserveAspectRatio", "xMidYMid meet");
        svg.setAttributeNS(null, "viewBox", "0 0 " + width + " " + height);
        let newImage = doc.createElementNS(svg_ns,"image");
        svg.appendChild(newImage);
        newImage.setAttributeNS(xlink_ns, "xlink:href", makeRelative.call(this, href));
        newImage.setAttributeNS(null, "height", height);
        newImage.setAttributeNS(null, "width", width);
        if (includeImageSourceUrl) {
            let desc = doc.createElementNS(svg_ns,"desc");
            svg.appendChild(desc);
            desc.appendChild(document.createTextNode(origin));
        }
        return div;
    }

    // assumes we're making link from file in OEBPS\Text to OEBPS\Images
    var makeRelative = function(href) {
        return ".." + href.substr(5);
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

    // discard empty divs created when moving elements
    var removeEmptyDivElements = function(element) {
        util.removeElements(util.getElements(element, "div", e => isStringWhiteSpace(e.innerHTML)));
    }

    var addXmlDeclarationToStart = function(dom) {
        // As JavaScript doesn't support this directly, need to do a dirty hack using
        // a processing instruction
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=318086
        let declaration = dom.createProcessingInstruction("xml", "version='1.0' encoding='utf-8'");
        dom.insertBefore(declaration, dom.childNodes[0]);
    }

    var addXhtmlDocTypeToStart = function(dom) {
        // So that we don't get weird as hell issues with certain tags we use a dirty hack to add a doctype
        let docType = dom.implementation.createDocumentType("html","-//W3C//DTD XHTML 1.1//EN", "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd");
        dom.insertBefore(docType, dom.children[0]);
    }

    var isStringWhiteSpace = function (s) {
        return !(/\S/.test(s));
    }

    var isElementWhiteSpace = function(element) {
        if (element.nodeType === Node.TEXT_NODE) {
            return util.isStringWhiteSpace(element.textContent);
        } 
        if ((element.tagName === "IMG") || (element.tagName === "image")) {
            return false;
        }
        if (0 < (util.getElements(element, "img").length) || (0 < util.getElements(element, "image").length)) {
            return false;
        }
        return util.isStringWhiteSpace(element.innerText);
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

    var safeForFileName = function (title) {
        if(title) {
            // Allow only a-z regardless of case and numbers as well as hyphens and underscores; replace spaces with underscores
            title = title.replace(/ /gi, '_').replace(/([^a-z0-9_\-]+)/gi, '');
            // There is technically a 255 character limit in windows for file paths. 
            // So we will allow files to have 20 characters and when they go over we split them 
            // we then truncate the middle so that the file name is always different
            return (title.length > 20 ? title.substr(0, 10) + "..." + title.substr(title.length - 10, title.length) : title);
        }
        return "";
    }

    var safeForId = function (id) {
        if(id) {
            // Allow only a-z regardless of case and numbers as well as hyphens and underscores
            id = id.replace(/([^a-z0-9_\-]+)/gi, '');
            return id;
        }
        return "";
    }

    var makeStorageFileName = function (subdirectory, index, title, extension) {
        let that = this;
        if(title) {
            title = "_" + that.safeForFileName(title) + ".";
        }else {
            // We don't want issues so just set it to . to prepare for the extension
            title = ".";
        }
        return subdirectory + that.zeroPad(index) + title + extension;
    }

    var isTextAreaField = function (element) {
        return (element.tagName === "TEXTAREA");
    }

    var isTextInputField = function (element) {
        return (element.tagName === "INPUT") &&
           ((element.type === "text") || (element.type === "url"));
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

    var styleSheetFileName = function () {
        return "OEBPS/Styles/stylesheet.css";
    }

    return {
        createEmptyXhtmlDoc: createEmptyXhtmlDoc,
        createSvgImageElement: createSvgImageElement,
        resolveRelativeUrl: resolveRelativeUrl,
        addToDocBody: addToDocBody,
        removeNode: removeNode,
        removeElements: removeElements,
        removeComments: removeComments,
        removeEmptyDivElements: removeEmptyDivElements,
        makeRelative: makeRelative,
        makeStorageFileName: makeStorageFileName,
        addXmlDeclarationToStart: addXmlDeclarationToStart,
        addXhtmlDocTypeToStart: addXhtmlDocTypeToStart,
        getElement: getElement,
        getElements: getElements,
        safeForFileName: safeForFileName,
        safeForId: safeForId,
        styleSheetFileName: styleSheetFileName,
        isStringWhiteSpace: isStringWhiteSpace,
        isElementWhiteSpace: isElementWhiteSpace,
        isHeaderTag: isHeaderTag,
        isTextAreaField: isTextAreaField,
        isTextInputField: isTextInputField,
        syncLoadSampleDoc : syncLoadSampleDoc,
        xmlToString: xmlToString,
        zeroPad: zeroPad
    };
})();

