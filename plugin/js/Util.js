/*
    General dumping ground for misc functions that I can't find a better place for.
    Warning: Don't look at this too closely, or you may loose your sanity.
    Side Note: Putting these all in one place may not have been a good idea. 
    I think they're breeding. There seem to be more functions in here that I didn't create.
*/

"use strict";

var util = (function () {

    var sleep = function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    var randomInteger = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var isFirefox = function() {
        return (typeof(browser) !== "undefined");
    }

    var extensionVersion = function() {
        let runtime = util.isFirefox() ? browser.runtime : chrome.runtime;
        // when running unit tests, runtime is not available
        return (typeof(runtime) === "undefined") ? "unknown" : runtime.getManifest().version;
    }

    var createEmptyXhtmlDoc = function() {
        let doc = document.implementation.createDocument(util.XMLNS, "", null);
        util.addXhtmlDocTypeToStart(doc);
        let htmlNode = doc.createElementNS(util.XMLNS, "html");
        doc.appendChild(htmlNode);
        let head = doc.createElementNS(util.XMLNS, "head");
        htmlNode.appendChild(head);
        head.appendChild(doc.createElementNS(util.XMLNS, "title"));
        populateHead(doc, head);
        let body = doc.createElementNS(util.XMLNS, "body");
        htmlNode.appendChild(body);
        return doc;
    }

    var populateHead = function(doc, head) {
        let style = doc.createElementNS(util.XMLNS, "link");
        head.appendChild(style);
        style.setAttribute("href", util.makeRelative(util.styleSheetFileName()));
        style.setAttribute("type", "text/css");
        style.setAttribute("rel", "stylesheet");
    }

    var createEmptyHtmlDoc = function() {
        let doc = document.implementation.createHTMLDocument("");
        util.populateHead(doc, doc.querySelector("head"));
        return doc
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
        return new URL(relativeUrl, baseUrl).href;
    }

    var extractHostName = function (url) {
        return new URL(url).hostname;
    };

    var extractFilename = function(hyperlink) {
        let filename = hyperlink.pathname
            .split("/")
            .filter(p => p != "")
            .pop();
        return (filename == null) ? "" : filename;
    }

    var extractFilenameFromUrl = function(url) {
        return new URL(url).pathname
            .split("/")
            .filter(p => p != "")
            .pop();
    }

    var getParamFromUrl = function(url, paramName) {
        return new URL(url).searchParams.get(paramName);
    }
    
    // set the base tag of a DOM to specified URL.
    var setBaseTag = function (url, dom) {
        if (dom != null) {
            let tags = Array.from(dom.getElementsByTagName("base"));
            if (0 < tags.length) {
                tags[0].setAttribute("href", url);
            } else {
                let baseTag = dom.createElement("base");
                baseTag.setAttribute("href", url);
                dom.getElementsByTagName("head")[0].appendChild(baseTag);
            }
        }
    }

    // refer https://usamaejaz.com/cloudflare-email-decoding/
    var decodeCloudflareProtectedEmails = function(content) {
        for(let link of [...content.querySelectorAll(".__cf_email__")]) {
            util.replaceCloudflareProtectedLink(link);
        }
        let links = [...content.querySelectorAll("a")].
            filter(l => (l.href != null) && l.href.includes("/cdn-cgi/l/email-protection"));
        for(let link of links) {
            util.replaceCloudflareProtectedLink(link);
        }
    }

    var replaceCloudflareProtectedLink = function(link) {
        let cyptedEmail = link.getAttribute("data-cfemail");
        if (cyptedEmail == null) {
            cyptedEmail = link.hash;
            if (!util.isNullOrEmpty(cyptedEmail)) {
                cyptedEmail = cyptedEmail.substring(1);
            }
        }
        if (cyptedEmail != null) {
            let decryptedEmail = decodeEmail(cyptedEmail);
            let textNode = document.createTextNode(decryptedEmail);
            link.parentNode.insertBefore(textNode, link);
            link.remove();
        }
    }

    var decodeEmail = function(encodedString) {
        let extractHex = function(index) {
            return parseInt(encodedString.substr(index, 2), 16);
        };
        let key = extractHex(0);
        let email = "";
        for(let index = 2; index < encodedString.length; index += 2) {
            email +=  String.fromCharCode(extractHex(index) ^ key);
        }
        return email;
    }

    // delete all nodes in the supplied array
    var removeElements = function (elements) {
        for(let e of elements) {
            e.remove();
        }
    }

    var removeChildElementsMatchingCss = function (element, css) {
        if (element !== null) {
            util.removeElements(element.querySelectorAll(css));
        }
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
        util.removeElements(util.getElements(element, "div", e => util.isElementWhiteSpace(e)));
    }

    var removeTrailingWhiteSpace = function(element) {
        let children = element.childNodes;
        while ((0 < children.length) && util.isElementWhiteSpace(children[children.length - 1])) {
            children[children.length - 1].remove();
        }
    }

    var removeLeadingWhiteSpace = function(element) {
        let children = element.childNodes;
        while ((0 < children.length) && util.isElementWhiteSpace(children[0])) {
            children[0].remove();
        }
    }

    var removeScriptableElements = function(element) {
        util.removeChildElementsMatchingCss(element, "script, iframe");
        util.removeEventHandlers(element);
    }

    var removeMicrosoftWordCrapElements = function(element) {
        for(let node of util.getElements(element, "O:P")) {
            util.flattenNode(node);
        }
    }

    var flattenNode = function(node) {
        while (node.hasChildNodes()) {
            node.parentNode.insertBefore(node.childNodes[0], node);
        }
        node.remove();
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
        element.removeAttribute("width");
        element.removeAttribute("height");
    }

    var removeUnwantedWordpressElements = function(element) {
        let ccs = "div.sharedaddy, div.wpcnt, ul.post-categories, div.mistape_caption, "
            + "div.wpulike, div.wp-next-post-navi, .ezoic-adpicker-ad, .ezoic-ad, "
            + "ins.adsbygoogle";
        util.removeChildElementsMatchingCss(element, ccs);
    }

    var removeShareLinkElements = function(contentElement) {
        util.removeChildElementsMatchingCss(contentElement, "div.sharepost");
    }

    var convertPreTagToPTags = function(dom, element, splitOn) {
        let normalizeEol = function(s) {
            return s.replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
        };
    
        splitOn = splitOn || "\n";
        let strings = normalizeEol(element.innerText).split(splitOn);
        element.innerHTML = "";
        for(let s of strings) {
            let p = dom.createElement("p");
            p.appendChild(dom.createTextNode(s));
            element.appendChild(p);
        }
    }

    var prepForConvertToXhtml = function(element) {
        this.replaceCenterTags(element);
        this.replaceUnderscoreTags(element);
        this.replaceSTags(element);
    }

    var replaceCenterTags = function(element) {
        for(let center of element.querySelectorAll("center")) {
            let replacement = center.ownerDocument.createElement("p");
            replacement.style.textAlign = "center";
            util.convertElement(center, replacement);
        }
    }

    var replaceUnderscoreTags = function(element) {
        for(let underscore of element.querySelectorAll("U")) {
            let replacement = underscore.ownerDocument.createElement("span");
            // ToDo: figure out how to do this by manipulating the style directly
            replacement.setAttribute("style", "text-decoration: underline;");
            util.convertElement(underscore, replacement);
        }
    }

    var replaceSTags = function(element) {
        for(let underscore of element.querySelectorAll("s")) {
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
        element.remove();
    }

    var moveChildElements = function(from, to) {
        while (from.hasChildNodes()) {
            let node = from.childNodes[0];
            to.appendChild(node);
        };
    }

    var copyAttributes = function(from, to) {
        for(let i = 0; i < from.attributes.length; ++i) {
            let attr = from.attributes[i];
            try {
                to.setAttribute(attr.localName, attr.value);
            } catch (e) {
                // probably invalid attribute name.  Discard
            }
        };
    }

    var fixDelayLoadedImages = function(element, delayAttrib) {
        for(let i of element.querySelectorAll("img")) {
            let url = i.getAttribute(delayAttrib);
            if (!util.isNullOrEmpty(url)) {
                i.src = url;
            }
        }
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
            g.remove();
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
        while (inlineElement.hasChildNodes()) {
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

    var getFirstImgSrc = function(dom, selector) {
        return  dom.querySelector(selector)?.querySelector("img")?.src ?? null;
    }

    var extractHashFromUri = function(uri) {
        let index = uri.indexOf("#");
        return (index === -1) ? null : uri.substring(index + 1);
    }

    var resolveLazyLoadedImages = function(content, imgCss, attrName) {
        attrName = attrName || "data-src";
        for(let img of content.querySelectorAll(imgCss)) {
            let dataSrc = img.getAttribute(attrName);
            if (dataSrc !== null) {
                img.src = dataSrc.trim();
            }
        }
    }

    var makeHyperlinksRelative = function(baseUri, content) {
        for(let link of util.getElements(content, "a", e => this.isLocalHyperlink(baseUri, e))) {
            link.href = "#" + this.extractHashFromUri(link.href);
        }
    }

    var isLocalHyperlink = function(baseUri, link) {
        return link.href.startsWith(baseUri) && (link.href.indexOf("#") != -1);
    }

    var findPrimaryStyleSettings = function(element, styleProperties) {
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
 
        let mergeStyles = function(parentStyle, currentStyle, styleProperty) {
            if (currentStyle == null) {
                return parentStyle;
            }
            let c = currentStyle[styleProperty];
            return c != "" ? c : parentStyle; 
        } 

        let updateStat = function(map, key, count) {
            let total = map.get(key);
            if (total === undefined) {
                total = 0;
            }
            map.set(key, total + count);
        } 

        let walk = function(element, stats, parentStyle, styleProperties) {
            let mergedStyle = [];
            let count = characterCountForElement(element);
            for(let i = 0; i < styleProperties.length; ++i) {
                let merged = mergeStyles(parentStyle[i], element.style, styleProperties[i]);
                updateStat(stats[i], merged, count);
                mergedStyle.push(merged);
            }
            for(let i = 0; i < element.childElementCount; ++i) {
                walk(element.children[i], stats, mergedStyle, styleProperties);
            }
        }  

        let stats = styleProperties.map(() => new Map());
        let initialStyle = styleProperties.map(() => undefined);
        
        walk(element, stats, initialStyle, styleProperties);
        return stats.map(s => findMaxCount(s));
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
        let styleProperties = ["color", "fontSize"];
        let primary = util.findPrimaryStyleSettings(element, styleProperties);
        for(let i = 0; i < styleProperties.length; ++i) {
            util.removeStyleValue(element, styleProperties[i], primary[i]);
        }
    }

    // move up heading if higher levels are missing, i.e h2 to h1, h3 to h2 if there's no h1.
    var removeUnusedHeadingLevels = function(contentElement) {
        let usedHeadings = util.HEADER_TAGS.map(tag => [...contentElement.querySelectorAll(tag)])
            .filter(headings => 0 < headings.length);
        for(let i = 0; i < usedHeadings.length; ++i) {
            for(let element of usedHeadings[i]) {
                let replacement = element.ownerDocument.createElement(util.HEADER_TAGS[i]);
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
        if (contentElement == null) {
            return [];
        }

        let linkSet = new Set();
        let includeLink = function(link) {
            // ignore links with no name or link
            if (util.isNullOrEmpty(link.innerText) || util.isNullOrEmpty(link.href)) {
                return false;
            };
            // ignore duplicate links
            let href = util.normalizeUrlForCompare(link.href);
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

    var removeTrailingSlash = function(url) {
        return url.endsWith("/") ? url.substring(0, url.length - 1) : url;
    }

    var removeAnchor = function(url) {
        let index = url.indexOf("#");
        return (0 <= index) ? url.substring(0, index) : url;
    }

    var normalizeUrlForCompare = function(url) {
        let noTrailingSlash = util.removeTrailingSlash(util.removeAnchor(url));
        
        const protocolSeperator = "://";
        let protocolIndex = noTrailingSlash.indexOf(protocolSeperator);
        return (protocolIndex < 0) ?  noTrailingSlash
            : noTrailingSlash.substring(protocolIndex + protocolSeperator.length);
    }

    var hyperLinkToChapter = function(link, newArc) {
        return {
            sourceUrl:  link.href,
            title: link.innerText.trim(),
            newArc: (newArc === undefined) ? null : newArc
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
        let declaration = dom.createProcessingInstruction("xml", "version=\"1.0\" encoding=\"utf-8\"");
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
        if (element.querySelector("img, image") !== null) {
            return false;
        }
        return util.isStringWhiteSpace(element.innerText);
    }

    var isHeaderTag = function(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        let tag = node.tagName.toLowerCase(); 
        return util.HEADER_TAGS.some(t => tag === t);
    }

    var isUrl = function(string) {
        try {
            let url = new URL(string);
            return url.protocol.startsWith("http:")
              || url.protocol.startsWith("https:");
        } catch (e) {
            return false;
        }
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

    var iterateElements = function(root, filter, whatToShow = NodeFilter.SHOW_ELEMENT) {
        let iterator = document.createNodeIterator(root,
            whatToShow,
            { acceptNode: filter }
        );
        let elements = [];
        let node = null;
        while ((node = iterator.nextNode()) != null) {
            elements.push(node);
        }
        return elements;        
    }
    
    var getElements = function(dom, tagName, filter) {
        let array = Array.from(dom.getElementsByTagName(tagName));
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
            (parent.textContent.length  < 200)) {
            return parent;
        }
        return element;
    }
    
    var safeForFileName = function (title, maxLength = 20) {
        if(title) {
            // Allow only a-z regardless of case and numbers as well as hyphens and underscores; replace spaces and no-break spaces with underscores
            title = title.replace(/ |\u00a0/gi, "_").replace(/([^a-z0-9_-]+)/gi, "");
            // There is technically a 255 character limit in windows for file paths. 
            // So we will allow files to have 20 characters and when they go over we split them 
            // we then truncate the middle so that the file name is always different
            const elipsis = "...";
            let splitLength = Math.floor((maxLength - elipsis.length) / 2);
            return title.length > maxLength
                ? title.substr(0, splitLength) + elipsis + title.substr(title.length - splitLength, title.length) 
                : title;
        }
        return "";
    }

    var makeStorageFileName = function (subdirectory, index, title, extension) {
        let that = this;
        if(title) {
            const safeLengthForNameInZip = 200;
            title = "_" + that.safeForFileName(title, safeLengthForNameInZip) + ".";
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

    var isXhtmlInvalid = function (xhtmlAsString, mimeType = "application/xml") {
        let doc = new DOMParser().parseFromString(xhtmlAsString, mimeType);
        let parsererror = doc.querySelector("parsererror");
        return (parsererror === null) ? null : parsererror.textContent;
    }

    var dctermsToTable = function (dom) {
        let table = dom.createElement("table");
        let body = dom.createElement("tbody");
        table.appendChild(body);
        for(let term of dom.querySelectorAll("meta[name*='dcterms.']")) {
            let row = dom.createElement("tr");
            body.appendChild(row);
            let td = dom.createElement("td");
            row.appendChild(td);
            td.textContent = term.getAttribute("name").replace("dcterms.", "");
            td = dom.createElement("td");
            row.appendChild(td);
            td.textContent = term.getAttribute("content");
        }
        return table;
    }

    var parseHtmlAndInsertIntoContent = function(htmlText, content) {
        let parsed = new DOMParser().parseFromString(htmlText, "text/html");
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }
        for (const tag of [...parsed.querySelector("body").children]) {
            content.appendChild(tag)
        }        
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

    var extractUrlFromBackgroundImage = function(element) {
        var background = element?.style?.backgroundImage;
        return background?.substring(5, background.length - 2) ?? null;
    }

    var extactSubstring = function(s, prefix, suffix) {
        if (typeof(prefix) !== "string") {
            let match = s.match(prefix);
            if (match === null) {
                throw new Error("prefix not found");
            } else {
                prefix = match[0];
            }
        }

        var i = s.indexOf(prefix);
        if (i < 0) {
            throw new Error("prefix not found");
        }        
        s = s.substring(i + prefix.length);
        i = s.indexOf(suffix);
        if (i < 0) {
            throw new Error("suffix not found");
        }        
        return s.substring(0, i);
    }

    var findIndexOfClosingQuote = function(s, startIndex) {
        let index = startIndex + 1;
        while(index < s.length && (s[index] !== "\""))
        {
            index += (s[index] === "\\") ? 2 : 1;
        }
        return index;
    }

    var findIndexOfClosingBracket = function(s, startIndex) {
        let index = startIndex + 1;
        let depth = 1;
        let c = s[index];
        while ((0 < depth) && (index < s.length)) {
            if ((c === "]") || (c === "}")) {
                --depth;
                if (depth == 0) {
                    return index;
                }
            } else if ((c === "[") || (c === "{")) {
                ++depth;
            } else if (c === "\"") {
                index = util.findIndexOfClosingQuote(s, index);
            } 
            ++index;
            c = s[index];
        }
        // unbalanced brackets
        return -1;
    }

    /** locate and extract JSON that is embedded in a string
     * @param {string} s - show/hide control
     * @param {string} prefix - text that preceeds the embedded JSON 
    */
    var locateAndExtractJson = function(s, prefix) {
        var findOpeningBracket = function(s, index) {
            while (index < s.length) {
                let ch = s[index];
                if ((ch==="[") || (ch === "{")) {
                    return index;
                }
                ++index;
            }
            return -1;
        };

        let index = s.indexOf(prefix);
        if (0 <= index) {
            index = findOpeningBracket(s, index + prefix.length);
            if (0 <= index) {
                let end = util.findIndexOfClosingBracket(s, index);
                if (index < end) {
                    let jsonString = s.substring(index, end + 1);
                    return JSON.parse(jsonString);
                }
            }
        }
        return null;
    }

    var createChapterTab = function(url) {
        return new Promise(function(resolve) {
            chrome.tabs.create({ url: url, active: false },
                function (tab) {
                    resolve(tab.id);
                }
            );
        });
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

        HEADER_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6" ],

        sleep: sleep,
        randomInteger: randomInteger,
        isFirefox: isFirefox,
        extensionVersion: extensionVersion,
        createEmptyXhtmlDoc: createEmptyXhtmlDoc,
        createEmptyHtmlDoc: createEmptyHtmlDoc,
        populateHead: populateHead,
        createSvgImageElement: createSvgImageElement,
        resolveRelativeUrl: resolveRelativeUrl,
        log: log,
        extractHostName: extractHostName,
        extractFilename: extractFilename,
        extractFilenameFromUrl: extractFilenameFromUrl,
        getParamFromUrl: getParamFromUrl,
        setBaseTag: setBaseTag,
        decodeCloudflareProtectedEmails: decodeCloudflareProtectedEmails,
        replaceCloudflareProtectedLink: replaceCloudflareProtectedLink,
        decodeEmail: decodeEmail,
        removeElements: removeElements,
        removeChildElementsMatchingCss: removeChildElementsMatchingCss,
        removeComments: removeComments,
        removeEmptyDivElements: removeEmptyDivElements,
        removeTrailingWhiteSpace: removeTrailingWhiteSpace,
        removeLeadingWhiteSpace: removeLeadingWhiteSpace,
        removeScriptableElements: removeScriptableElements,
        removeMicrosoftWordCrapElements: removeMicrosoftWordCrapElements,
        flattenNode: flattenNode,
        removeEventHandlers: removeEventHandlers,
        removeHeightAndWidthStyleFromParents: removeHeightAndWidthStyleFromParents,
        removeHeightAndWidthStyle: removeHeightAndWidthStyle,
        removeUnwantedWordpressElements: removeUnwantedWordpressElements,
        removeShareLinkElements: removeShareLinkElements,
        convertPreTagToPTags: convertPreTagToPTags, 
        prepForConvertToXhtml: prepForConvertToXhtml,
        replaceCenterTags: replaceCenterTags,
        replaceUnderscoreTags: replaceUnderscoreTags,
        replaceSTags: replaceSTags,
        convertElement: convertElement,
        moveChildElements: moveChildElements,
        copyAttributes: copyAttributes,
        fixDelayLoadedImages: fixDelayLoadedImages,
        fixBlockTagsNestedInInlineTags: fixBlockTagsNestedInInlineTags, 
        isBlockElementInside: isBlockElementInside,
        moveElementsOutsideTag: moveElementsOutsideTag,
        isNodeInTag: isNodeInTag,
        isInlineElement: isInlineElement,
        isBlockElement: isBlockElement,
        getFirstImgSrc: getFirstImgSrc,
        makeRelative: makeRelative,
        makeStorageFileName: makeStorageFileName,
        extractHashFromUri: extractHashFromUri,
        makeHyperlinksRelative: makeHyperlinksRelative, 
        resolveLazyLoadedImages: resolveLazyLoadedImages,
        isLocalHyperlink: isLocalHyperlink,
        findPrimaryStyleSettings: findPrimaryStyleSettings,
        removeStyleValue: removeStyleValue,
        setStyleToDefault: setStyleToDefault,
        removeUnusedHeadingLevels: removeUnusedHeadingLevels,
        isNullOrEmpty: isNullOrEmpty,
        wrapRawTextNode: wrapRawTextNode,
        hyperlinksToChapterList: hyperlinksToChapterList,
        removeTrailingSlash: removeTrailingSlash,
        removeAnchor: removeAnchor,
        normalizeUrlForCompare: normalizeUrlForCompare,
        hyperLinkToChapter: hyperLinkToChapter,
        createComment: createComment,
        addXmlDeclarationToStart: addXmlDeclarationToStart,
        addXhtmlDocTypeToStart: addXhtmlDocTypeToStart,
        iterateElements: iterateElements,
        getElement: getElement,
        getElements: getElements,
        moveIfParent: moveIfParent,
        safeForFileName: safeForFileName,
        styleSheetFileName: styleSheetFileName,
        isStringWhiteSpace: isStringWhiteSpace,
        isElementWhiteSpace: isElementWhiteSpace,
        isHeaderTag: isHeaderTag,
        isUrl: isUrl,
        isTextAreaField: isTextAreaField,
        isTextInputField: isTextInputField,
        isXhtmlInvalid: isXhtmlInvalid,
        dctermsToTable: dctermsToTable,
        parseHtmlAndInsertIntoContent: parseHtmlAndInsertIntoContent,
        extractUrlFromBackgroundImage: extractUrlFromBackgroundImage,
        extactSubstring: extactSubstring,
        findIndexOfClosingQuote: findIndexOfClosingQuote,
        findIndexOfClosingBracket: findIndexOfClosingBracket,
        locateAndExtractJson: locateAndExtractJson,
        createChapterTab: createChapterTab,
        syncLoadSampleDoc : syncLoadSampleDoc,
        xmlToString: xmlToString,
        zeroPad: zeroPad
    };
})();

class FootnoteExtractor {
    scriptElementsToFootnotes(dom) {
        let indexedFootnotes = new Map();
        [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes("toolTips('.classtoolTips"))
            .forEach(s => indexedFootnotes.set(this.getId(s), this.extractFootnoteText(s)));

        return this.getIdsUsedOnPage(dom)
            .map(id => this.makeSpan(indexedFootnotes.get(id), dom));
    }

    getIdsUsedOnPage(dom) {
        let extractId = (span) => [...span.classList]
            .filter(s => s.startsWith("class"))[0];

        return [...dom.querySelectorAll("span.tooltipsall")]
            .map(extractId);
    }

    getId(script) {
        return this.extractSubstring(script, "toolTips('.", ",").replace("'", "");
    }

    makeSpan(content, dom) {
        let span = dom.createElement("span");
        span.textContent = content;
        return span;
    }

    extractFootnoteText(content) {
        return this.extractSubstring(content, "tt_store_content = \"", "\"; toolTips('");
    }

    extractSubstring(content, startTag, endTag) {
        content = content.substring(content.indexOf(startTag) + startTag.length);
        return content.substring(0, content.indexOf(endTag));
    }
}
