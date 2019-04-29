"use strict";

/** Intended to strip XHTML down to minimum set of elements
 * (i.e. Clean up the dirty HTML sometimes encountered)
*/

class Sanitize {
    constructor() {
        this.attributesForTag = new Map();
        for(let t of Sanitize.TAG_LIST) {
            let attributes = ["id", "class", "style"];
            let extra = Sanitize.ATTRIBUTES[t];
            if (extra !== undefined) {
                for(let a of extra) {
                    attributes.push(a);
                }
            }
            this.attributesForTag.set(t, attributes);
        }
    }

    clean(element) {
        let e2 = this.cloneTag(element);
        return this.cloneChildren(e2, element);        
    }

    cloneTag(element) {
        let tag = element.tagName.toLowerCase();
        let validAttributes = this.attributesForTag.get(tag);
        if (validAttributes === undefined) {
            tag = "div";
            validAttributes = this.attributesForTag.get(tag);
        }
        let e2 = this.isSvgElement(tag)
            ? this.makeSvgElement(tag)
            : document.createElement(tag)
        return this.copyAttributes(e2, element, validAttributes);
    }    

    isSvgElement(tag) {
        return (tag === "svg") || (tag === "image") || (tag === "desc");
    }

    makeSvgElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    copyAttributes(e2, element, validAttributes) {
        for(let attribName of validAttributes) {
            let val = element.getAttribute(attribName);
            if (val !== null) {
                e2.setAttribute(attribName, val);
            }
        }
        return e2;
    }

    cloneChildren(e2, element) {
        for(let child of element.childNodes) {
            let clone = this.cloneChildNode(child);
            if (clone !== null) {
                e2.appendChild(clone);
            }
        }
        return e2;
    }

    cloneChildNode(childNode) {
        switch(childNode.nodeType) {
        case 1:
            // Element
            return this.clean(childNode);
        case 3:
            // Text
            return this.cleanTextNode(childNode);
        case 8:
            // comment
            return childNode.cloneNode();
        default:
            return null;
        }
    }

    cleanTextNode(textNode) {
        // ToDo: fully implement
        let text = Sanitize.stripInvalidCharsFromString(textNode.nodeValue);
        return document.createTextNode(text);
    }

    static stripInvalidChars(node) {
        let iterator = node.ownerDocument.createNodeIterator(node, NodeFilter.SHOW_TEXT, null); 
        let n = null;
        while ((n = iterator.nextNode()) != null) {
            let oldtext = n.nodeValue;
            let newText = Sanitize.stripInvalidCharsFromString(oldtext);
            if (oldtext.length !== newText.length) {
                n.nodeValue = newText;
            }
        }
        return node;
    }

    static stripInvalidCharsFromString(s) {
        return s.replace(Sanitize.InvalidCharsRegex, "");
    }
}

Sanitize.TAG_LIST = ["a", "abbr", "access", "action", 
    "address", "blockcode", "blockquote", "body", "br", "caption", "cite", "code",
    "col", "colgroup", "dd", "delete", "desc", "dfn", "di", "dispatch", "div", "dl",
    "dt", "em", "ev:listener", "group", "h", 
    "h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8",
    "handler", "head", "heading",
    "html", "img", "image", "input", "insert", "kbd", "l", "label", "li", "link",
    "load", "message", "meta", "model", "nl", "object", "ol", "output",
    "p", "param", "pre", "quote", "range", "rebuild", "recalculate",
    "refresh", "repeat", "reset", "revalidate", "ruby", "samp", "secret",
    "section", "select1", "select", "send", "separator", "setfocus",
    "setindex", "setvalue", "span", "standby", "strong", "style", "sub",
    "submit", "summary", "sup", "svg", "switch", "table", "tbody", "td",
    "textarea", "tfoot", "th", "thead", "title", "tr", "trigger",
    "ul", "upload", "var"];

Sanitize.ATTRIBUTES = {
    "a": ["href"],
    "img": ["src"],
    "image": ["xlink:href", "width", "height"],
    "svg": ["xmlns", "xmlns:xlink", "height", "width",  "version", "preserveAspectRatio", "viewBox"]
};

// The most common chars found in HTML that are not valid for XML
Sanitize.InvalidCharsRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;     // eslint-disable-line no-control-regex
