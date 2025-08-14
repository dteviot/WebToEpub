/*
    General dumping ground for misc functions that I can't find a better place for.
    Warning: Don't look at this too closely, or you may lose your sanity.
    Side Note: Putting these all in one place may not have been a good idea.
    I think they're breeding. There seem to be more functions in here that I didn't create.
*/

"use strict";

const util = (function() {
    var sleepController = new AbortController;
    
    function sleep(ms) {
        return new Promise(resolve => {
            function finished() {
                resolve();
                sleepController.signal.removeEventListener("abort", finished);
            }
            sleepController.signal.addEventListener("abort", finished);
            setTimeout(finished, ms);
        });
    }

    function randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isFirefox() {
        return (typeof (browser) !== "undefined");
    }

    function extensionVersion() {
        let runtime = isFirefox() ? browser.runtime : chrome.runtime;
        // when running unit tests, runtime is not available
        return (typeof (runtime) === "undefined") ? "unknown" : runtime.getManifest().version;
    }

    function createEmptyXhtmlDoc() {
        let doc = document.implementation.createDocument(XMLNS, "", null);
        addXhtmlDocTypeToStart(doc);
        let htmlNode = doc.createElementNS(XMLNS, "html");
        doc.appendChild(htmlNode);
        let head = doc.createElementNS(XMLNS, "head");
        htmlNode.appendChild(head);
        head.appendChild(doc.createElementNS(XMLNS, "title"));
        populateHead(doc, head);
        let body = doc.createElementNS(XMLNS, "body");
        htmlNode.appendChild(body);
        return doc;
    }

    function populateHead(doc, head) {
        let style = doc.createElementNS(XMLNS, "link");
        head.appendChild(style);
        style.setAttribute("href", makeRelative(styleSheetFileName()));
        style.setAttribute("type", "text/css");
        style.setAttribute("rel", "stylesheet");
    }

    function createEmptyHtmlDoc() {
        let doc = document.implementation.createHTMLDocument("");
        populateHead(doc, doc.querySelector("head"));
        return doc;
    }

    function createSvgImageElement(href, width, height, origin, includeImageSourceUrl) {
        let svg_ns = "http://www.w3.org/2000/svg";
        let xlink_ns = "http://www.w3.org/1999/xlink";
        let doc = createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let div = doc.createElementNS(XMLNS, "div");
        div.className = "svg_outer svg_inner";
        body.appendChild(div);
        const svg = document.createElementNS(svg_ns, "svg");
        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", xlink_ns);
        div.appendChild(svg);
        svg.setAttributeNS(null, "height", "99%");
        svg.setAttributeNS(null, "width", "100%");
        svg.setAttributeNS(null, "version", "1.1");
        svg.setAttributeNS(null, "preserveAspectRatio", "xMidYMid meet");
        svg.setAttributeNS(null, "viewBox", "0 0 " + width + " " + height);
        let newImage = doc.createElementNS(svg_ns, "image");
        svg.appendChild(newImage);
        newImage.setAttributeNS(xlink_ns, "xlink:href", makeRelative(href));
        newImage.setAttributeNS(null, "width", width);
        newImage.setAttributeNS(null, "height", height);
        if (includeImageSourceUrl) {
            let desc = doc.createElementNS(svg_ns, "desc");
            svg.appendChild(desc);
            desc.appendChild(document.createTextNode(origin));
        } else {
            svg.appendChild(createComment(doc, origin));
        }
        return div;
    }

    // assumes we're making link from file in OEBPS\Text to OEBPS\Images
    function makeRelative(href) {
        return ".." + href.substring(5);
    }

    function resolveRelativeUrl(baseUrl, relativeUrl) {
        return new URL(relativeUrl, baseUrl).href;
    }

    function extractHostName(url) {
        return new URL(url).hostname;
    }

    function extractFilename(hyperlink) {
        let filename = hyperlink.pathname
            .split("/")
            .filter(p => p !== "")
            .pop();
        return filename ?? "";
    }

    function extractFilenameFromUrl(url) {
        return new URL(url).pathname
            .split("/")
            .filter(p => p !== "")
            .pop();
    }

    function getParamFromUrl(url, paramName) {
        return new URL(url).searchParams.get(paramName);
    }

    // set the base tag of a DOM to specified URL.
    function setBaseTag(url, dom) {
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
    function decodeCloudflareProtectedEmails(content) {
        for (let link of [...content.querySelectorAll(".__cf_email__")]) {
            replaceCloudflareProtectedLink(link);
        }
        let links = [...content.querySelectorAll("a")].filter(l => (l.href != null) && l.href.includes("/cdn-cgi/l/email-protection"));
        for (let link of links) {
            replaceCloudflareProtectedLink(link);
        }
    }

    function replaceCloudflareProtectedLink(link) {
        let cyptedEmail = link.getAttribute("data-cfemail");
        if (cyptedEmail == null) {
            cyptedEmail = link.hash;
            if (!isNullOrEmpty(cyptedEmail)) {
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

    function decodeEmail(encodedString) {
        let extractHex = (index) => parseInt(encodedString.slice(index, index + 2), 16);
        let key = extractHex(0);
        let email = "";
        for (let index = 2; index < encodedString.length; index += 2) {
            email += String.fromCharCode(extractHex(index) ^ key);
        }
        return email;
    }

    // delete all nodes in the supplied array
    function removeElements(elements) {
        for (let e of elements) {
            e.remove();
        }
    }

    function removeChildElementsMatchingSelector(element, selector) {
        if (element !== null) {
            removeElements(element.querySelectorAll(selector));
        }
    }

    function removeComments(root) {
        let walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

        // if we delete currentNode, call to nextNode() fails.
        let nodeList = [];
        while (walker.nextNode()) {
            nodeList.push(walker.currentNode);
        }
        removeElements(nodeList);
    }

    // discard empty divs created when moving elements
    function removeEmptyDivElements(element) {
        removeElements(getElements(element, "div", e => isElementWhiteSpace(e)));
    }

    function removeTrailingWhiteSpace(element) {
        let children = element.childNodes;
        while ((0 < children.length) && isElementWhiteSpace(children[children.length - 1])) {
            children[children.length - 1].remove();
        }
    }

    function removeLeadingWhiteSpace(element) {
        let children = element.childNodes;
        while ((0 < children.length) && isElementWhiteSpace(children[0])) {
            children[0].remove();
        }
    }

    function removeHTMLUnknownElement(nodes) {
        let children = nodes.childNodes;
        for (let i = 0; i < children.length; i++) {
            if (children[i] instanceof HTMLUnknownElement) {
                children[i].remove();
            } else {
                removeHTMLUnknownElement(children[i]);
            }
        }
    }

    function removeScriptableElements(element) {
        removeChildElementsMatchingSelector(element, "script, iframe");
        removeEventHandlers(element);
    }

    function removeMicrosoftWordCrapElements(element) {
        for (let node of getElements(element, "O:P")) {
            flattenNode(node);
        }
    }

    function flattenNode(node) {
        while (node.hasChildNodes()) {
            node.parentNode.insertBefore(node.childNodes[0], node);
        }
        node.remove();
    }

    /**
     * @todo expand to remove ALL event handlers
     */
    function removeEventHandlers(contentElement) {
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            element.removeAttribute("onclick");
            element = walker.nextNode();
        }
    }

    function removeHeightAndWidthStyleFromParents(element) {
        let parent = element.parentElement;
        while ((parent != null) && (parent.tagName.toLowerCase() !== "body")) {
            removeHeightAndWidthStyle(parent);
            parent = parent.parentElement;
        }
    }

    function removeHeightAndWidthStyle(element) {
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

    function removeUnwantedWordpressElements(element) {
        let ccs = "div.sharedaddy, div.wpcnt, ul.post-categories, div.mistape_caption, "
            + "div.wpulike, div.wp-next-post-navi, .ezoic-adpicker-ad, .ezoic-ad, "
            + "ins.adsbygoogle";
        removeChildElementsMatchingSelector(element, ccs);
    }

    function removeShareLinkElements(contentElement) {
        removeChildElementsMatchingSelector(contentElement, "div.sharepost");
    }

    function convertPreTagToPTags(dom, element, splitOn) {
        let normalizeEol = (s) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        splitOn = splitOn || "\n";
        let strings = normalizeEol(element.innerText).split(splitOn);
        element.innerHTML = "";
        for (let s of strings) {
            let p = dom.createElement("p");
            p.appendChild(dom.createTextNode(s));
            element.appendChild(p);
        }
    }

    function prepForConvertToXhtml(element) {
        replaceCenterTags(element);
        replaceUnderscoreTags(element);
        replaceSTags(element);
    }

    function replaceCenterTags(element) {
        for (let center of element.querySelectorAll("center")) {
            let replacement = center.ownerDocument.createElement("p");
            replacement.style.textAlign = "center";
            convertElement(center, replacement);
        }
    }

    function replaceUnderscoreTags(element) {
        for (let underscore of element.querySelectorAll("U")) {
            let replacement = underscore.ownerDocument.createElement("span");
            // ToDo: figure out how to do this by manipulating the style directly
            replacement.setAttribute("style", "text-decoration: underline;");
            convertElement(underscore, replacement);
        }
    }

    function replaceSTags(element) {
        for (let underscore of element.querySelectorAll("s")) {
            let replacement = underscore.ownerDocument.createElement("span");
            // ToDo: figure out how to do this by manipulating the style directly
            replacement.setAttribute("style", "text-decoration: line-through;");
            convertElement(underscore, replacement);
        }
    }

    function convertElement(element, replacement) {
        let parent = element.parentElement;
        parent.insertBefore(replacement, element);
        moveChildElements(element, replacement);
        copyAttributes(element, replacement);
        element.remove();
    }

    function moveChildElements(from, to) {
        while (from.firstChild) {
            to.appendChild(from.firstChild);
        }
    }

    function copyAttributes(from, to) {
        for (let i = 0; i < from.attributes.length; ++i) {
            let attr = from.attributes[i];
            try {
                to.setAttribute(attr.localName, attr.value);
            } catch (e) {
                // probably invalid attribute name.  Discard
            }
        }
    }

    function fixDelayLoadedImages(element, delayAttrib) {
        for (let i of element.querySelectorAll("img")) {
            let url = i.getAttribute(delayAttrib);
            if (!isNullOrEmpty(url)) {
                i.src = url;
            }
        }
    }

    function fixBlockTagsNestedInInlineTags(contentElement) {
        // if an inline tag contains block tags, move contents out of inline tag
        // refer https://github.com/dteviot/WebToEpub/issues/62
        let garbage = [];
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            if (isInlineElement(element) && isBlockElementInside(element)) {
                moveElementsOutsideTag(element);
                garbage.push(element);
            }
            element = walker.nextNode();
        }

        for (let g of garbage) {
            g.remove();
        }
    }

    function isBlockElementInside(inlineElement) {
        let walker = inlineElement.ownerDocument.createTreeWalker(inlineElement, NodeFilter.SHOW_ELEMENT);
        let element = null;
        while ((element = walker.nextNode())) {
            if (isBlockElement(element)) {
                return true;
            }
        }

        // if here, no block element found
        return false;
    }

    function moveElementsOutsideTag(inlineElement) {
        while (inlineElement.hasChildNodes()) {
            let node = inlineElement.childNodes[0];
            inlineElement.parentNode.insertBefore(node, inlineElement);

            // handle case of <inline><inline><block></block></inline></inline>
            fixBlockTagsNestedInInlineTags(node);
        }
    }

    function isNodeInTag(tags, node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        } else {
            let tagName = node.tagName.toLowerCase();
            return tags.some(t => t === tagName);
        }
    }

    function isInlineElement(node) {
        return isNodeInTag(INLINE_ELEMENTS, node);
    }

    function isBlockElement(node) {
        return isNodeInTag(BLOCK_ELEMENTS, node);
    }

    function getFirstImgSrc(dom, selector) {
        return dom.querySelector(selector)?.querySelector("img")?.src ?? null;
    }

    function extractHashFromUri(uri) {
        let index = uri.indexOf("#");
        return (index === -1) ? null : uri.substring(index + 1);
    }

    function resolveLazyLoadedImages(content, imgCss, attrName) {
        attrName = attrName || "data-src";
        for (let img of content.querySelectorAll(imgCss)) {
            let dataSrc = img.getAttribute(attrName);
            if (dataSrc !== null) {
                img.src = dataSrc.trim();
            }
        }
    }

    function makeHyperlinksRelative(baseUri, content) {
        for (let link of getElements(content, "a", e => isLocalHyperlink(baseUri, e))) {
            link.href = "#" + extractHashFromUri(link.href);
        }
    }

    function isLocalHyperlink(baseUri, link) {
        return link.href.startsWith(baseUri) && (link.href.indexOf("#") !== -1);
    }

    function findPrimaryStyleSettings(element, styleProperties) {
        let characterCountForElement = function(element) {
            let count = 0;
            let child = element.firstChild;
            while (child) {
                if (child.nodeType === Node.TEXT_NODE) {
                    count += child.nodeValue.length;
                }
                child = child.nextSibling;
            }
            return count;
        };

        let findMaxCount = function(map) {
            let maxPair = [undefined, 0];
            for (let pair of map) {
                if (maxPair[1] <= pair[1]) {
                    maxPair = pair;
                }
            }
            return maxPair[0];
        };

        let mergeStyles = function(parentStyle, currentStyle, styleProperty) {
            if (currentStyle === null || currentStyle === undefined) {
                return parentStyle;
            }
            let c = currentStyle[styleProperty];
            return c !== "" ? c : parentStyle;
        };

        let updateStat = function(map, key, count) {
            let total = map.get(key);
            if (total === undefined) {
                total = 0;
            }
            map.set(key, total + count);
        };

        let walk = function(element, stats, parentStyle, styleProperties) {
            let mergedStyle = [];
            let count = characterCountForElement(element);
            for (let i = 0; i < styleProperties.length; ++i) {
                let merged = mergeStyles(parentStyle[i], element.style, styleProperties[i]);
                updateStat(stats[i], merged, count);
                mergedStyle.push(merged);
            }
            for (let i = 0; i < element.childElementCount; ++i) {
                walk(element.children[i], stats, mergedStyle, styleProperties);
            }
        };

        let stats = styleProperties.map(() => new Map());
        let initialStyle = styleProperties.map(() => undefined);

        walk(element, stats, initialStyle, styleProperties);
        return stats.map(s => findMaxCount(s));
    }

    /**
     *  Remove specified inline style value from element and its descendants
     */
    function removeStyleValue(element, styleName, value) {
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
        } while (walker.nextNode());
    }

    /** If web page is using custom font color or size, set to default */
    function setStyleToDefault(element) {
        let styleProperties = ["color", "fontSize"];
        let primary = findPrimaryStyleSettings(element, styleProperties);
        for (let i = 0; i < styleProperties.length; ++i) {
            removeStyleValue(element, styleProperties[i], primary[i]);
        }
    }

    // move up heading if higher levels are missing, i.e. h2 to h1, h3 to h2 if there's no h1.
    function removeUnusedHeadingLevels(contentElement) {
        let usedHeadings = HEADER_TAGS.map(tag => [...contentElement.querySelectorAll(tag)])
            .filter(headings => 0 < headings.length);
        for (let i = 0; i < usedHeadings.length; ++i) {
            for (let element of usedHeadings[i]) {
                let replacement = element.ownerDocument.createElement(HEADER_TAGS[i]);
                convertElement(element, replacement);
            }
        }
    }

    /**
     * wrap any raw text in <p></p> tags
     */
    function wrapRawTextNode(node) {
        if ((node.nodeType === Node.TEXT_NODE) && !isStringWhiteSpace(node.nodeValue)) {
            let wrapper = node.ownerDocument.createElement("p");
            wrapper.appendChild(node.ownerDocument.createTextNode(node.nodeValue));
            return wrapper;
        } else {
            return node;
        }
    }

    function isNullOrEmpty(s) {
        return ((s == null) || isStringWhiteSpace(s));
    }

    function hyperlinksToChapterList(contentElement, isChapterPredicate, getChapterArc) {
        if (contentElement == null) {
            return [];
        }

        let linkSet = new Set();
        let includeLink = function(link) {
            // ignore links with no name or link
            if (isNullOrEmpty(link.innerText) || isNullOrEmpty(link.href)) {
                return false;
            }

            // ignore duplicate links
            let href = normalizeUrlForCompare(link.href);
            if (linkSet.has(href)) {
                return false;
            }

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
            }

            return currentArc;
        };

        return getElements(contentElement, "a", a => includeLink(a))
            .map(link => hyperLinkToChapter(link, newArcValueForChapter(link)));
    }

    function removeTrailingSlash(url) {
        return url.endsWith("/") ? url.substring(0, url.length - 1) : url;
    }

    function removeAnchor(url) {
        let index = url.indexOf("#");
        return (0 <= index) ? url.substring(0, index) : url;
    }

    function normalizeUrlForCompare(url) {
        let noTrailingSlash = removeTrailingSlash(removeAnchor(url));

        const protocolSeparator = "://";
        let protocolIndex = noTrailingSlash.indexOf(protocolSeparator);
        return (protocolIndex < 0) ? noTrailingSlash
            : noTrailingSlash.substring(protocolIndex + protocolSeparator.length);
    }

    function hyperLinkToChapter(link, newArc) {
        return {
            sourceUrl: link.href,
            title: link.innerText.trim(),
            newArc: (newArc === undefined) ? null : newArc
        };
    }

    function createComment(doc, content) {
        // comments are not allowed to contain a double hyphen
        let escaped = content.replace(/--/g, "%2D%2D");
        return doc.createComment("  " + escaped + "  ");
    }

    function addXmlDeclarationToStart(dom) {
        // As JavaScript doesn't support this directly, need to do a dirty hack using
        // a processing instruction
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=318086
        let declaration = dom.createProcessingInstruction("xml", "version=\"1.0\" encoding=\"utf-8\"");
        dom.insertBefore(declaration, dom.childNodes[0]);
    }

    function addXhtmlDocTypeToStart(dom) {
        // So that we don't get weird as hell issues with certain tags we use a dirty hack to add a doctype
        let docType = dom.implementation.createDocumentType("html", "-//W3C//DTD XHTML 1.1//EN", "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd");
        dom.insertBefore(docType, dom.children[0]);
    }

    function isStringWhiteSpace(s) {
        return !(/\S/.test(s));
    }

    function isElementWhiteSpace(element) {
        switch (element.nodeType) {
            case Node.TEXT_NODE:
                return isStringWhiteSpace(element.textContent);
            case Node.COMMENT_NODE:
                return true;
        }
        if ((element.tagName === "IMG") || (element.tagName === "image")) {
            return false;
        }
        if (element.querySelector("img, image") !== null) {
            return false;
        }
        return isStringWhiteSpace(element.innerText);
    }

    function isHeaderTag(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        let tag = node.tagName.toLowerCase();
        return HEADER_TAGS.some(t => tag === t);
    }

    function isUrl(string) {
        try {
            let url = new URL(string);
            return url.protocol.startsWith("http:")
                || url.protocol.startsWith("https:");
        } catch (e) {
            return false;
        }
    }

    function xmlToString(dom) {
        addXmlDeclarationToStart(dom);
        return new XMLSerializer().serializeToString(dom);
    }

    function zeroPad(num) {
        let padded = "000" + num;
        padded = padded.substring(padded.length - 4, padded.length);
        return padded;
    }

    function iterateElements(root, filter, whatToShow = NodeFilter.SHOW_ELEMENT) {
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

    function getElements(dom, tagName, filter) {
        let array = Array.from(dom.getElementsByTagName(tagName));
        return (filter === undefined || typeof filter !== "function")
            ? array : array.filter(filter);
    }

    function getElement(dom, tagName, filter) {
        let elements = getElements(dom, tagName, filter);
        return (elements.length === 0) ? null : elements[0];
    }

    /**
     *   Used in removeNextAndPreviousChapterHyperlinks()
     *   Basically, we want to remove all elements related to the hyperlink
     *   So we want to remove the parent element. However, need to be careful
     *   we don't go so high we wipe out the entire document
     */
    function moveIfParent(element, parentTag) {
        let parent = element.parentNode;
        if ((parent.tagName.toLowerCase() === parentTag) &&
            (parent.textContent.length < 200)) {
            return parent;
        }
        return element;
    }

    function safeForFileName(title, maxLength = 20) {
        if (title) {
            // Allow only a-z regardless of case and numbers as well as hyphens and underscores; replace spaces and no-break spaces with underscores
            title = title.replace(/[ \u00a0]/gi, "_").replace(/([^a-z0-9_-]+)/gi, "");
            // There is technically a 255-character limit in windows for file paths.
            // So we will allow files to have 20 characters and when they go over we split them
            // we then truncate the middle so that the file name is always different
            const ellipsis = "...";
            let splitLength = Math.floor((maxLength - ellipsis.length) / 2);
            return title.length > maxLength
                ? title.slice(0, splitLength) + ellipsis + title.slice(title.length - splitLength)
                : title;
        }
        return "";
    }

    function makeStorageFileName(subdirectory, index, title, extension) {
        if (title) {
            const safeLengthForNameInZip = 200;
            title = "_" + safeForFileName(title, safeLengthForNameInZip) + ".";
        } else {
            // We don't want issues so just set it to . to prepare for the extension
            title = ".";
        }
        return subdirectory + zeroPad(index) + title + extension;
    }

    function isTextAreaField(element) {
        return (element.tagName === "TEXTAREA");
    }

    function isTextInputField(element) {
        return (element.tagName === "INPUT") &&
            ((element.type === "text") || (element.type === "url"));
    }

    function isXhtmlInvalid(xhtmlAsString, mimeType = "application/xml") {
        let doc = new DOMParser().parseFromString(xhtmlAsString, mimeType);
        let parserError = doc.querySelector("parsererror");
        return (parserError === null) ? null : parserError.textContent;
    }

    function dctermsToTable(dom) {
        let table = dom.createElement("table");
        let body = dom.createElement("tbody");
        table.appendChild(body);
        for (let term of dom.querySelectorAll("meta[name*='dcterms.']")) {
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

    function parseHtmlAndInsertIntoContent(htmlText, content) {
        let parsed = util.sanitize(htmlText);
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }
        for (const tag of [...parsed.querySelector("body").children]) {
            content.appendChild(tag);
        }
    }

    // allow disabling logging from one place
    function log(arg) { // eslint-disable-line no-unused-vars
        // ToDo: uncomment this for debug logging
        // console.log(arg);
    }

    // This is for Unit Testing only
    function syncLoadSampleDoc(fileName, url) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", fileName, false);
        xhr.send(null);
        let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
        setBaseTag(url, dom);
        return dom;
    }

    function styleSheetFileName() {
        return "OEBPS/Styles/stylesheet.css";
    }

    function extractUrlFromBackgroundImage(element) {
        const background = element?.style?.backgroundImage;
        return background?.substring(5, background.length - 2) ?? null;
    }

    function extractSubstring(s, prefix, suffix) {
        if (typeof (prefix) !== "string") {
            let match = s.match(prefix);
            if (match === null) {
                throw new Error("prefix not found");
            } else {
                prefix = match[0];
            }
        }

        let i = s.indexOf(prefix);
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

    function findIndexOfClosingQuote(s, startIndex) {
        let index = startIndex + 1;
        while (index < s.length && (s[index] !== "\"")) {
            index += (s[index] === "\\") ? 2 : 1;
        }
        return index;
    }

    function findIndexOfClosingBracket(s, startIndex) {
        let index = startIndex + 1;
        let depth = 1;
        let c = s[index];
        while (0 < depth && index < s.length) {
            if (c === "]" || c === "}") {
                --depth;
                if (depth === 0) {
                    return index;
                }
            } else if (c === "[" || c === "{") {
                ++depth;
            } else if (c === "\"") {
                index = findIndexOfClosingQuote(s, index);
            }
            ++index;
            c = s[index];
        }
        // unbalanced brackets
        return -1;
    }

    /** locate and extract JSON that is embedded in a string
     * @param {string} s - show/hide control
     * @param {string} prefix - text that precedes the embedded JSON
     */
    function locateAndExtractJson(s, prefix) {
        const findOpeningBracket = function(s, index) {
            while (index < s.length) {
                let ch = s[index];
                if ((ch === "[") || (ch === "{")) {
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
                let end = findIndexOfClosingBracket(s, index);
                if (index < end) {
                    let jsonString = s.substring(index, end + 1);
                    return JSON.parse(jsonString);
                }
            }
        }
        return null;
    }

    function createChapterTab(url) {
        return new Promise((resolve) => {
            chrome.tabs.create({url: url, active: false}, (tab) => {
                resolve(tab.id);
            });
        });
    }

    function removeAttributes(element, attributeNames) {
        if (!element || attributeNames == null) return;

        // Handle single attribute name as string
        if (typeof attributeNames === "string") {
            element.removeAttribute(attributeNames);
            return;
        }

        // Handle array of attribute names
        if (Array.isArray(attributeNames)) {
            for (const name of attributeNames) {
                if (typeof name === "string") {
                    element.removeAttribute(name);
                }
            }
        }
    }

    function removeEmptyAttributes(content) {
        const elements = content.querySelectorAll("*");

        for (const element of elements) {
            const attributes = element.attributes;
            const attributesToRemove = [];

            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].value.trim() === "") {
                    attributesToRemove.push(attributes[i].name);
                }
            }

            for (let i = attributesToRemove.length - 1; i >= 0; i--) {
                element.removeAttribute(attributesToRemove[i]);
            }
        }
    }

    function removeSpansWithNoAttributes(content) {
        // within p or div tags, spans with no attributes have no purpose
        const spans = content.querySelectorAll("p span, div span");

        for (const span of spans) {
            if (span.attributes.length === 0) {
                while (span.firstChild) {
                    span.parentNode.insertBefore(span.firstChild, span);
                }
                span.parentNode.removeChild(span);
            }
        }
    }

    function replaceSemanticInlineStylesWithTags(element, removeLeftoverStyles = false) {
        if (element.hasAttribute("style")) {
            let styleText = element.getAttribute("style");

            // Map of style patterns to their semantic HTML equivalents
            const styleToTag = [
                { regex: /font-style\s*:\s*(italic|oblique)\s*;?/g, tag: "i" },
                { regex: /font-weight\s*:\s*(bold|[7-9]\d\d)\s*;?/g, tag: "b" },
                { regex: /text-decoration\s*:\s*underline\s*;?/g, tag: "u" },
                { regex: /text-decoration\s*:\s*line-through\s*;?/g, tag: "s" }
            ];

            // Apply semantic tags and remove corresponding styles
            for (const style of styleToTag) {
                if (style.regex.test(styleText)) {
                    // Reset lastIndex since test() advances it
                    style.regex.lastIndex = 0;
                    wrapInnerContentInTag(element, style.tag);
                    styleText = styleText.replace(style.regex, "");
                }
            }

            // Remove non-semantic font-weight
            styleText = styleText.replace(/font-weight\s*:\s*(normal|[1-4]\d\d)\s*;?/g, "");
            styleText = styleText.trim();

            if (styleText && (!removeLeftoverStyles || /italic|bold|font-weight|underline|line-through/.test(styleText))) {
                element.setAttribute("style", styleText);
            } else {
                // Remove all remaining styles except text-align:center if present
                element.style.getPropertyValue("text-align") === "center"
                    ? element.setAttribute("style", "text-align: center;")
                    : element.removeAttribute("style");
            }
        }
    }

    function wrapInnerContentInTag(element, tagName) {
        const wrapper = document.createElement(tagName);
        moveChildElements(element, wrapper);
        element.appendChild(wrapper);
    }

    function getDefaultExtensionByMime(mimeType)
    {
        let retval = MIME_TYPE_EXTENSIONS[mimeType];
        if (retval) retval = retval[0];
        return retval;
    }
    function detectMimeType(b64) {
        for (var s in MIME_TYPE_SIGNATURES) {
            if (b64.indexOf(s) === 0) {
                return MIME_TYPE_SIGNATURES[s][0];
            }
        }
    }

    function sanitize(dirty) {
        const clean = DOMPurify.sanitize(dirty);
        return new DOMParser().parseFromString(clean, "text/html");
    }

    function sanitizeNode(dirty) {
        // don't need to sanitize text nodes
        // and DOMPurify deletes them if they're whitespace
        return (dirty?.nodeType === 3)
            ? dirty.cloneNode(true)
            : sanitize(dirty).body.firstChild;
    }

    // Define constants
    const XMLNS = "http://www.w3.org/1999/xhtml";

    // ugly, but we're treating <u> and <s> as inline (they are not)
    const INLINE_ELEMENTS = ["b", "big", "i", "small", "tt", "abbr", "acronym", "cite",
        "code", "dfn", "em", "kbd", "strong", "samp", "time", "var", "a", "bdo",
        "br", "img", "map", "object", "q", "script", "span", "sub", "sup",
        "button", "input", "label", "select", "textarea", "u", "s"];

    const BLOCK_ELEMENTS = ["address", "article", "aside", "blockquote", "canvas",
        "dd", "div", "dl", "fieldset", "figcaption", "figure", "footer",
        "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr",
        "li", "main", "nav", "noscript", "ol", "output", "p", "pre",
        "section", "table", "tfoot", "ul", "video"];

    const HEADER_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

    const MIME_TYPE_EXTENSIONS = {
        "image/jpeg": ["jpg", "jpeg", "jpe"],
        "image/png": ["png"],
        "image/gif": ["gif"],
        "image/webp": ["webp"],
        "image/bmp": ["bmp", "dib"],
        "image/tiff": ["tif", "tiff"],
        "image/svg+xml": ["svg"],
        "image/x-icon": ["ico"],
        "image/vnd.microsoft.icon": ["ico"],
        "image/heif": ["heif"],
        "image/heic": ["heic"],
        "image/x-xbitmap": ["xbm"],
        "image/x-portable-bitmap": ["pbm"],
        "image/x-portable-graymap": ["pgm"],
        "image/x-portable-pixmap": ["ppm"],
        "image/x-portable-anymap": ["pnm"],
        "image/x-cmu-raster": ["ras"],
        "image/x-tga": ["tga"],
        "image/jxr": ["jxr"],
        "image/ktx": ["ktx"],
        "image/apng": ["apng"],
        "image/avif": ["avif"]
    };

    const MIME_TYPE_SIGNATURES = {
        "/9j/": ["image/jpeg"],
        "iVBORw0KGgo=": ["image/png", "image/apng"],
        "R0lGODdh": ["image/gif"],
        "R0lGODlh": ["image/gif"],
        "UklGR": ["image/webp"],
        "Qk0=": ["image/bmp"],
        "SUkqAA==": ["image/tiff"],
        "TU0AKg==": ["image/tiff"],
        "PD94bWw=": ["image/svg+xml"],
        "AAABAA==": ["image/x-icon", "image/vnd.microsoft.icon"],
        "ZnR5cGhlaWZj": ["image/heif"],
        "ZnR5cG1pZjE=": ["image/heif"],
        "ZnR5cGhlaWNj": ["image/heic"],
        "SUm8": ["image/jxr"],
        "q0tUWCAxMb0NCgo=": ["image/ktx"],
        "AAACAA==": ["image/x-tga"],
        "ZnR5cGF2aWY=": ["image/avif"],
        "UDAx": ["image/x-portable-bitmap"],
        "UDAy": ["image/x-portable-graymap"],
        "UDAz": ["image/x-portable-pixmap"],
        "UDA0": ["image/x-portable-anymap"],
        "WaZqlQ==": ["image/x-cmu-raster"]
    };

    return {
        XMLNS: XMLNS,
        INLINE_ELEMENTS: INLINE_ELEMENTS,
        BLOCK_ELEMENTS: BLOCK_ELEMENTS,
        HEADER_TAGS: HEADER_TAGS,
        sleep: sleep,
        sleepController: sleepController,
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
        removeChildElementsMatchingSelector: removeChildElementsMatchingSelector,
        removeComments: removeComments,
        removeEmptyDivElements: removeEmptyDivElements,
        removeTrailingWhiteSpace: removeTrailingWhiteSpace,
        removeLeadingWhiteSpace: removeLeadingWhiteSpace,
        removeHTMLUnknownElement: removeHTMLUnknownElement,
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
        extractSubstring: extractSubstring,
        findIndexOfClosingQuote: findIndexOfClosingQuote,
        findIndexOfClosingBracket: findIndexOfClosingBracket,
        locateAndExtractJson: locateAndExtractJson,
        createChapterTab: createChapterTab,
        syncLoadSampleDoc: syncLoadSampleDoc,
        xmlToString: xmlToString,
        zeroPad: zeroPad,
        sanitize: sanitize,
        sanitizeNode: sanitizeNode,
        removeAttributes: removeAttributes,
        removeEmptyAttributes: removeEmptyAttributes,
        removeSpansWithNoAttributes: removeSpansWithNoAttributes,
        replaceSemanticInlineStylesWithTags: replaceSemanticInlineStylesWithTags,
        wrapInnerContentInTag: wrapInnerContentInTag,
        getDefaultExtensionByMime: getDefaultExtensionByMime,
        detectMimeType: detectMimeType
    };
})();
