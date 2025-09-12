// Core utility functions adapted from WebToEpub extension
const util = (function() {
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isNullOrEmpty(s) {
        return ((s == null) || isStringWhiteSpace(s));
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
        let nodeList = [];
        while (walker.nextNode()) {
            nodeList.push(walker.currentNode);
        }
        removeElements(nodeList);
    }

    function removeScriptableElements(element) {
        removeChildElementsMatchingSelector(element, "script, iframe");
        removeEventHandlers(element);
    }

    function removeEventHandlers(contentElement) {
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            element.removeAttribute("onclick");
            element = walker.nextNode();
        }
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

    function extractHostName(url) {
        return new URL(url).hostname;
    }

    function safeForFileName(title, maxLength = 50) {
        if (title) {
            title = title.replace(/[ \u00a0]/gi, "_").replace(/([^a-z0-9_-]+)/gi, "");
            const ellipsis = "...";
            let splitLength = Math.floor((maxLength - ellipsis.length) / 2);
            return title.length > maxLength
                ? title.slice(0, splitLength) + ellipsis + title.slice(title.length - splitLength)
                : title;
        }
        return "";
    }

    function isUrl(string) {
        try {
            let url = new URL(string);
            return url.protocol.startsWith("http:") || url.protocol.startsWith("https:");
        } catch (e) {
            return false;
        }
    }

    function normalizeUrlForCompare(url) {
        let removeTrailingSlash = (url) => url.endsWith("/") ? url.substring(0, url.length - 1) : url;
        let removeAnchor = (url) => {
            let index = url.indexOf("#");
            return (0 <= index) ? url.substring(0, index) : url;
        };
        
        let noTrailingSlash = removeTrailingSlash(removeAnchor(url));
        const protocolSeparator = "://";
        let protocolIndex = noTrailingSlash.indexOf(protocolSeparator);
        return (protocolIndex < 0) ? noTrailingSlash
            : noTrailingSlash.substring(protocolIndex + protocolSeparator.length);
    }

    function hyperlinksToChapterList(contentElement, isChapterPredicate) {
        if (contentElement == null) {
            return [];
        }

        let linkSet = new Set();
        let includeLink = function(link) {
            if (isNullOrEmpty(link.innerText) || isNullOrEmpty(link.href)) {
                return false;
            }

            let href = normalizeUrlForCompare(link.href);
            if (linkSet.has(href)) {
                return false;
            }

            linkSet.add(href);
            return isChapterPredicate ? isChapterPredicate(link) : true;
        };

        return getElements(contentElement, "a", a => includeLink(a))
            .map(link => ({
                sourceUrl: link.href,
                title: link.innerText.trim(),
                isIncludeable: true
            }));
    }

    function getElements(dom, tagName, filter) {
        let array = Array.from(dom.getElementsByTagName(tagName));
        return (filter === undefined || typeof filter !== "function")
            ? array : array.filter(filter);
    }

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

    function moveChildElements(from, to) {
        while (from.firstChild) {
            to.appendChild(from.firstChild);
        }
    }

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
            replacement.setAttribute("style", "text-decoration: underline;");
            convertElement(underscore, replacement);
        }
    }

    function replaceSTags(element) {
        for (let underscore of element.querySelectorAll("s")) {
            let replacement = underscore.ownerDocument.createElement("span");
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

    function getFirstImgSrc(dom, selector) {
        return dom.querySelector(selector)?.querySelector("img")?.src ?? null;
    }

    return {
        sleep: sleep,
        isNullOrEmpty: isNullOrEmpty,
        isStringWhiteSpace: isStringWhiteSpace,
        isElementWhiteSpace: isElementWhiteSpace,
        removeElements: removeElements,
        removeChildElementsMatchingSelector: removeChildElementsMatchingSelector,
        removeComments: removeComments,
        removeScriptableElements: removeScriptableElements,
        removeEventHandlers: removeEventHandlers,
        removeUnwantedWordpressElements: removeUnwantedWordpressElements,
        removeShareLinkElements: removeShareLinkElements,
        extractHostName: extractHostName,
        safeForFileName: safeForFileName,
        isUrl: isUrl,
        normalizeUrlForCompare: normalizeUrlForCompare,
        hyperlinksToChapterList: hyperlinksToChapterList,
        getElements: getElements,
        setBaseTag: setBaseTag,
        moveChildElements: moveChildElements,
        removeEmptyDivElements: removeEmptyDivElements,
        removeTrailingWhiteSpace: removeTrailingWhiteSpace,
        removeLeadingWhiteSpace: removeLeadingWhiteSpace,
        removeEmptyAttributes: removeEmptyAttributes,
        removeSpansWithNoAttributes: removeSpansWithNoAttributes,
        prepForConvertToXhtml: prepForConvertToXhtml,
        replaceCenterTags: replaceCenterTags,
        replaceUnderscoreTags: replaceUnderscoreTags,
        replaceSTags: replaceSTags,
        convertElement: convertElement,
        copyAttributes: copyAttributes,
        getFirstImgSrc: getFirstImgSrc
    };
})();

// Export for global use
window.util = util;