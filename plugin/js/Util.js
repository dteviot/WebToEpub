/*
    General dumping ground for misc functions that I can't find a better place for.
    Warning: Don't look at this too closely, or you may loose your sanity.
    Side Note: Putting these all in one place may not have been a good idea. 
    I think they're breeding. There seem to be more functions in here that I didn't create.
*/

"use strict";

var util = (function () {

    var createEmptyXhtmlDoc = function() {
        let doc = document.implementation.createDocument(util.XMLNS, "", null);
        util.addXhtmlDocTypeToStart(doc);
        let htmlNode = doc.createElementNS(util.XMLNS, "html");
        doc.appendChild(htmlNode);
        let head = doc.createElementNS(util.XMLNS, "head");
        htmlNode.appendChild(head);
        head.appendChild(doc.createElementNS(util.XMLNS, "title"));
        let style = doc.createElementNS(util.XMLNS, "link");
        head.appendChild(style);
        style.setAttribute("href", util.makeRelative(util.styleSheetFileName()));
        style.setAttribute("type", "text/css");
        style.setAttribute("rel", "stylesheet");
        let body = doc.createElementNS(util.XMLNS, "body");
        htmlNode.appendChild(body);
        return doc;
    }

    var createSvgImageElement = function (href, width, height, origin, includeImageSourceUrl) {
        let svg_ns = "http://www.w3.org/2000/svg";
        let xlink_ns = "http://www.w3.org/1999/xlink";
        let that = this;
        let doc = that.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let div = doc.createElementNS(util.XMLNS, "div");
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
        newImage.setAttributeNS(xlink_ns, "xlink:href", util.makeRelative(href));
        newImage.setAttributeNS(null, "width", width);
        newImage.setAttributeNS(null, "height", height);
        if (includeImageSourceUrl) {
            let desc = doc.createElementNS(svg_ns,"desc");
            svg.appendChild(desc);
            desc.appendChild(document.createTextNode(origin));
        } else {
            svg.appendChild(util.createComment(doc, origin));
        }
        return div;
    }

    // assumes we're making link from file in OEBPS\Text to OEBPS\Images
    var makeRelative = function(href) {
        return ".." + href.substr(5);
    }

    var resolveRelativeUrl = function(baseUrl, relativeUrl) {
        // Assumes parent document has a <base> element
        let base = document.getElementsByTagName("base")[0];
        let oldHref = base.href;

        // this gets the browser to do the work for us
        let resolver = document.createElement("a");
        base.href = baseUrl;
        resolver.href = relativeUrl;
        let resolvedUrl = resolver.href;  

        // restore and return
        base.href = oldHref;
        return resolvedUrl;
    }

    var extractHostName = function (url) {
        let parser = document.createElement("a");
        parser.href = url;
        return parser.hostname;
    };

    var addToDocBody = function (dom, contentToAdd) {
        dom.getElementsByTagName("body")[0].appendChild(contentToAdd);
    }

    // set the base tag of a DOM to specified URL.
    var setBaseTag = function (url, dom) {
        if (dom != null) {
            let tags = Array.prototype.slice.apply(dom.getElementsByTagName("base"));
            if (0 < tags.length) {
                tags[0].setAttribute("href", url);
            } else {
                let baseTag = dom.createElement("base");
                baseTag.setAttribute("href", url);
                dom.getElementsByTagName("head")[0].appendChild(baseTag);
            }
        }
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
        util.removeElements(util.getElements(element, "div", e => util.isStringWhiteSpace(e.innerHTML)));
    }

    var removeTrailingWhiteSpace = function(element) {
        let children = element.childNodes;
        while ((0 < children.length) && util.isElementWhiteSpace(children[children.length - 1])) {
            util.removeNode(children[children.length - 1]);
        }
    }

    var removeLeadingWhiteSpace = function(element) {
        let children = element.childNodes;
        while ((0 < children.length) && util.isElementWhiteSpace(children[0])) {
            util.removeNode(children[0]);
        }
    }

    var removeScriptableElements = function(element) {
        util.removeElements(util.getElements(element, "script"));
        util.removeElements(util.getElements(element, "iframe"));
        util.removeEventHandlers(element);
    }

    /**
    * @todo expand to remove ALL event handlers
    */
    var removeEventHandlers = function(contentElement) {
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            element.removeAttribute("onclick");
            element = walker.nextNode();
        };
    }

    var removeHeightAndWidthStyleFromParents = function(element) {
        let parent = element.parentElement;
        while ((parent != null) && (parent.tagName.toLowerCase() !== "body")) {
            util.removeHeightAndWidthStyle(parent);
            parent = parent.parentElement;
        }
    }

    var removeHeightAndWidthStyle = function(element) {
        let style = element.style;
        if ((style.width !== "") || (style.height !== "")) {
            style.width = null;
            style.height = null;
            if (style.length === 0) {
                // avoid a style="" attribute in element
                element.removeAttribute("style");
            }
        }
    }

    var removeUnwantedWordpressElements = function(element) {
        let isUnwantedDiv = function(div) {
            return ((div.className ==="wpcnt") || div.className.startsWith("sharedaddy"))
        };
        util.removeElements(util.getElements(element, "div",  e => isUnwantedDiv(e)));
        util.removeElements(util.getElements(element, "ul",  e => e.className === "post-categories"));
    }

    var prepForConvertToXhtml = function(element) {
        this.replaceCenterTags(element);
        this.replaceUnderscoreTags(element);
        this.replaceSTags(element);
    }

    var replaceCenterTags = function(element) {
        for(let center of util.getElements(element, "center")) {
            let replacement = center.ownerDocument.createElement("p");
            replacement.style.textAlign = "center";
            util.convertElement(center, replacement);
        }
    }

    var replaceUnderscoreTags = function(element) {
        for(let underscore of util.getElements(element, "U")) {
            let replacement = underscore.ownerDocument.createElement("span");
            // ToDo: figure out how to do this by manipulating the style directly
            replacement.setAttribute("style", "text-decoration: underline;");
            util.convertElement(underscore, replacement);
        }
    }

    var replaceSTags = function(element) {
        for(let underscore of util.getElements(element, "s")) {
            let replacement = underscore.ownerDocument.createElement("span");
            // ToDo: figure out how to do this by manipulating the style directly
            replacement.setAttribute("style", "text-decoration: line-through;");
            util.convertElement(underscore, replacement);
        }
    }

    var convertElement = function(element, replacement) {
        let parent = element.parentElement;
        parent.insertBefore(replacement, element);
        util.moveChildElements(element, replacement);
        util.copyAttributes(element, replacement);
        util.removeNode(element);
    }

    var moveChildElements = function(from, to) {
        while (0 < from.childNodes.length) {
            let node = from.childNodes[0];
            to.appendChild(node);
        };
    }

    var copyAttributes = function(from, to) {
        for(let i = 0; i < from.attributes.length; ++i) {
            let attr = from.attributes[i];
            to.setAttribute(attr.localName, attr.value);
        };
    }

    var fixBlockTagsNestedInInlineTags = function(contentElement) {
        // if an inline tag contains block tags, move contents out of inline tag
        // refer https://github.com/dteviot/WebToEpub/issues/62
        let garbage = [];
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            if (util.isInlineElement(element) && util.isBlockElementInside(element)) {
                util.moveElementsOutsideTag(element);
                garbage.push(element);
            };
            element = walker.nextNode();
        };

        for(let g of garbage) {
            util.removeNode(g);
        };
    }

    var isBlockElementInside = function(inlineElement) {
        let walker = inlineElement.ownerDocument.createTreeWalker(inlineElement, NodeFilter.SHOW_ELEMENT);
        let element = null;
        while ((element = walker.nextNode())) {
            if (util.isBlockElement(element)) {
                return true;
            };
        };
        // if get here no block element found
        return false;
    }

    var moveElementsOutsideTag = function(inlineElement) {
        while (0 < inlineElement.childNodes.length) {
            let node = inlineElement.childNodes[0];
            inlineElement.parentNode.insertBefore(node, inlineElement);
            
            // handle case of <inline><inline><block></block></inline></inline>
            util.fixBlockTagsNestedInInlineTags(node);
        };
    }

    var isNodeInTag = function(tags, node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        } else {
            let tagName = node.tagName.toLowerCase();
            return tags.some(t => t === tagName);
        }
    }

    var isInlineElement = function(node) {
        return this.isNodeInTag(util.INLINE_ELEMENTS, node);
    }

    var isBlockElement = function(node) {
        return this.isNodeInTag(util.BLOCK_ELEMENTS, node);
    }

    var removeUnneededIds = function(contentElement) {
        let hashes = util.getAllHyperlinkHashes(contentElement);
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = null;
        while ((element = walker.nextNode())) {
            if ((element.id !== "") && !hashes.has(element.id)) {
                element.removeAttribute("id");
            }
        };
    }

    var getAllHyperlinkHashes = function(element) {
        // ToDo: should exclude hyperlinks that don't point to this page
        let hashes = new Set();
        for(let link of util.getElements(element, "a", e => e.href.indexOf("#") != -1)) {
            hashes.add(util.extractHashFromUri(link.href));
        }
        return hashes;
    }

    var extractHashFromUri = function(uri) {
        let index = uri.indexOf("#");
        return (index === -1) ? null : uri.substring(index + 1);
    }

    var makeHyperlinksRelative = function(baseUri, content) {
        for(let link of util.getElements(content, "a", e => this.isLocalHyperlink(baseUri, e))) {
            link.href = "#" + this.extractHashFromUri(link.href);
        }
    }

    var isLocalHyperlink = function(baseUri, link) {
        return link.href.startsWith(baseUri) && (link.href.indexOf("#") != -1);
    }

    var findPrimaryFontColourAndSize = function(element) {
        let characterCountForElement = function(element) {
            let count = 0;
            let child = element.firstChild
            while (child) {
                if (child.nodeType === Node.TEXT_NODE) {
                    count += child.nodeValue.length;
                }
                child = child.nextSibling;
            }
            return count;
        }

        let findMaxCount = function(map) {
            let maxPair = [ undefined, 0 ];
            for(let pair of map) {
                if (maxPair[1] <= pair[1]) {
                    maxPair = pair;
                }
            }
            return maxPair[0];
        }
 
        let mergeStyles = function(parentStyle, currentStyle) {
            let color = parentStyle.color;
            let fontSize = parentStyle.fontSize;
            if (currentStyle.color != "") {
                color = currentStyle.color;
            }
            if (currentStyle.fontSize != "") {
                fontSize = currentStyle.fontSize;
            }
            return { color: color, fontSize: fontSize };
        } 

        let updateStat = function(stats, mergedStyle, field, count) {
            let map = stats[field];
            let key = mergedStyle[field];
            let total = map.get(key);
            if (total === undefined) {
                total = 0;
            }
            map.set(key, total + count);
        } 

        let updateStats = function(stats, mergedStyle, element) {
            let count = characterCountForElement(element);
            updateStat(stats, mergedStyle, "color", count);
            updateStat(stats, mergedStyle, "fontSize", count);
        } 

        let walk = function(element, stats, parentStyle) {
            let mergedStyle = mergeStyles(parentStyle, element.style);
            updateStats(stats, mergedStyle, element);
            for(let i = 0; i < element.childElementCount; ++i) {
                walk(element.children[i], stats, mergedStyle);
            }
        }  

        let stats = { color: new Map(), fontSize: new Map() };
        let initialStyle = { color: undefined, fontSize: undefined };
        walk(element, stats, initialStyle);
        return { color: findMaxCount(stats.color), fontSize: findMaxCount(stats.fontSize) };
    }

    /**
    *  Remove specified inline style value from element and its descendants
    */
    var removeStyleValue = function(element, styleName, value) {
        if (value === undefined) {
            return;
        }
        let walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        do {
            let node = walker.currentNode;
            let style = node.style;
            if (style[styleName] === value) {
                style[styleName] = null;
                if (style.length === 0) {
                    node.removeAttribute("style");
                }
            }
        }while (walker.nextNode());
    }

    /** If web page is using custom font color or size, set to default */
    var setStyleToDefault = function(element) {
        let primary = util.findPrimaryFontColourAndSize(element);
        util.removeStyleValue(element, "color", primary.color);
        util.removeStyleValue(element, "fontSize", primary.fontSize);
    }

    // move up heading if higher levels are missing, i.e h2 to h1, h3 to h2 if there's no h1.
    var removeUnusedHeadingLevels = function(contentElement) {
        let tags = [ "h1", "h2", "h3", "h4", "h5", "h6" ];
        let usedHeadings = tags.map(tag => util.getElements(contentElement, tag))
            .filter(headings => 0 < headings.length);
        for(let i = 0; i < usedHeadings.length; ++i) {
            for(let element of usedHeadings[i]) {
                let replacement = element.ownerDocument.createElement(tags[i]);
                util.convertElement(element, replacement);
            }
        }
    }

    /**
    * wrap any raw text in <p></p> tags
    */
    var wrapRawTextNode = function (node) {
        if ((node.nodeType === Node.TEXT_NODE) && !util.isStringWhiteSpace(node.nodeValue)) {
            let wrapper = node.ownerDocument.createElement("p");
            wrapper.appendChild(node.ownerDocument.createTextNode(node.nodeValue));
            return wrapper;
        } else {
            return node;
        }
    }

    var isNullOrEmpty = function(s) {
        return ((s == null) || util.isStringWhiteSpace(s));
    }

    var hyperlinksToChapterList = function(contentElement, isChapterPredicate, getChapterArc) {
        let linkSet = new Set();
        let includeLink = function(link) {
            // ignore links with no name or link
            if (util.isNullOrEmpty(link.innerText) || util.isNullOrEmpty(link.href)) {
                return false;
            };
            // ignore duplicate links
            let href = util.normalizeUrl(link.href);
            if (linkSet.has(href)) {
                return false;
            };
            linkSet.add(href);
            return isChapterPredicate ? isChapterPredicate(link) : true;
        };

        // only set newArc when arc changes
        let currentArc = null;
        let newArcValueForChapter = function(link) {
            if (getChapterArc) {
                let arc = getChapterArc(link);
                if (arc === currentArc) {
                    return null;
                } else {
                    currentArc = arc;
                    return currentArc;
                }
            };
            return currentArc;
        }

        let chaptersList = util.getElements(contentElement, "a", a => includeLink(a))
            .map(link => util.hyperLinkToChapter(link, newArcValueForChapter(link)));
        return chaptersList;
    }

    var normalizeUrl = function(url) {
        // remove trailing '/'
        return (url[url.length - 1] === "/") ? url.substring(0, url.length - 1) : url;
    }

    var hyperLinkToChapter = function(link, newArc) {
        return {
            sourceUrl:  link.href,
            title: link.innerText.trim(),
            newArc: newArc
        };
    }

    var createComment = function(doc, content) {
        // comments are not allowed to contain a double hyphen
        let escaped = content.replace(/--/g, "%2D%2D");
        return doc.createComment("  " + escaped + "  ");
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
        switch (element.nodeType) {
        case Node.TEXT_NODE:
            return util.isStringWhiteSpace(element.textContent);
        case Node.COMMENT_NODE:
            return true;
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

    /**
    *   Used in removeNextAndPreviousChapterHyperlinks()
    *   Basically, we want to remove all elements related to the hyperlink
    *   So we want to remove the parent element.  However need to be be careful
    *   we don't go so high we wipe out the entire document
    */
    var moveIfParent = function(element, parentTag) {
        let parent = element.parentNode;
        if ((parent.tagName.toLowerCase() === parentTag) &&
            (parent.innerText.length  < 200)) {
            return parent;
        }
        return element;
    }
    
    var safeForFileName = function (title) {
        if(title) {
            // Allow only a-z regardless of case and numbers as well as hyphens and underscores; replace spaces with underscores
            title = title.replace(/ /gi, "_").replace(/([^a-z0-9_\-]+)/gi, "");
            // There is technically a 255 character limit in windows for file paths. 
            // So we will allow files to have 20 characters and when they go over we split them 
            // we then truncate the middle so that the file name is always different
            return (title.length > 20 ? title.substr(0, 10) + "..." + title.substr(title.length - 10, title.length) : title);
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

    /**
    * @todo: replace with something better
    *  for time being, just show to user.
    */
    var logError = function(error) {
        window.showErrorMessage(error);
    }

    // allow disabling loging from one place
    var log = function(arg) { // eslint-disable-line no-unused-vars
        // ToDo: uncomment this for debug logging
        // console.log(arg);
    }

    // This is for Unit Testing only
    function syncLoadSampleDoc(fileName, url) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", fileName, false);
        xhr.send(null);
        let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
        util.setBaseTag(url, dom);
        return dom;
    }

    var styleSheetFileName = function () {
        return "OEBPS/Styles/stylesheet.css";
    }

    return {
        XMLNS: "http://www.w3.org/1999/xhtml",

        // ugly, but we're treating <u> and <s> as inline (they are not)
        INLINE_ELEMENTS: ["b","big","i","small","tt","abbr","acronym","cite",
            "code","dfn","em","kbd","strong","samp","time","var", "a","bdo",
            "br","img","map","object","q","script","span","sub","sup",
            "button","input","label","select","textarea","u","s"],

        BLOCK_ELEMENTS: ["address","article","aside","blockquote","canvas",
            "dd","div","dl","fieldset","figcaption","figure","footer",
            "form","h1","h2","h3","h4","h5","h6","header","hgroup","hr",
            "li","main","nav","noscript","ol","output","p","pre",
            "section","table","tfoot","ul","video"],

        createEmptyXhtmlDoc: createEmptyXhtmlDoc,
        createSvgImageElement: createSvgImageElement,
        resolveRelativeUrl: resolveRelativeUrl,
        log: log,
        logError: logError,
        extractHostName: extractHostName,
        addToDocBody: addToDocBody,
        setBaseTag: setBaseTag,
        removeNode: removeNode,
        removeElements: removeElements,
        removeComments: removeComments,
        removeEmptyDivElements: removeEmptyDivElements,
        removeTrailingWhiteSpace: removeTrailingWhiteSpace,
        removeLeadingWhiteSpace: removeLeadingWhiteSpace,
        removeScriptableElements: removeScriptableElements,
        removeEventHandlers: removeEventHandlers,
        removeHeightAndWidthStyleFromParents: removeHeightAndWidthStyleFromParents,
        removeHeightAndWidthStyle: removeHeightAndWidthStyle,
        removeUnwantedWordpressElements: removeUnwantedWordpressElements,
        prepForConvertToXhtml: prepForConvertToXhtml,
        replaceCenterTags: replaceCenterTags,
        replaceUnderscoreTags: replaceUnderscoreTags,
        replaceSTags: replaceSTags,
        convertElement: convertElement,
        moveChildElements: moveChildElements,
        copyAttributes: copyAttributes,
        fixBlockTagsNestedInInlineTags: fixBlockTagsNestedInInlineTags, 
        isBlockElementInside: isBlockElementInside,
        moveElementsOutsideTag: moveElementsOutsideTag,
        isNodeInTag: isNodeInTag,
        isInlineElement: isInlineElement,
        isBlockElement: isBlockElement,
        makeRelative: makeRelative,
        makeStorageFileName: makeStorageFileName,
        removeUnneededIds: removeUnneededIds,
        getAllHyperlinkHashes: getAllHyperlinkHashes,
        extractHashFromUri: extractHashFromUri,
        makeHyperlinksRelative: makeHyperlinksRelative, 
        isLocalHyperlink: isLocalHyperlink,
        findPrimaryFontColourAndSize: findPrimaryFontColourAndSize,
        removeStyleValue: removeStyleValue,
        setStyleToDefault: setStyleToDefault,
        removeUnusedHeadingLevels: removeUnusedHeadingLevels,
        isNullOrEmpty: isNullOrEmpty,
        wrapRawTextNode: wrapRawTextNode,
        hyperlinksToChapterList: hyperlinksToChapterList,
        normalizeUrl: normalizeUrl,
        hyperLinkToChapter: hyperLinkToChapter,
        createComment: createComment,
        addXmlDeclarationToStart: addXmlDeclarationToStart,
        addXhtmlDocTypeToStart: addXhtmlDocTypeToStart,
        getElement: getElement,
        getElements: getElements,
        moveIfParent: moveIfParent,
        safeForFileName: safeForFileName,
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

