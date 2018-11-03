"use strict";

/** Intented to strip XHTML down to minimum set of elements
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
        let e2 = document.createElement(tag);
        return this.copyAttributes(e2, element, validAttributes);
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
        default:
            return null;
        }
    }

    cleanTextNode(textNode) {
        // ToDo: fully implement
        return textNode;
    }
}

Sanitize.TAG_LIST = ["a", "abbr", "access", "action", 
    "address", "blockcode", "blockquote", "body", "caption", "cite", "code",
    "col", "colgroup", "dd", "delete", "dfn", "di", "dispatch", "div", "dl",
    "dt", "em", "ev:listener", "group", "h", "handler", "head", "heading",
    "html", "img", "input", "insert", "kbd", "l", "label", "li", "link",
    "load", "message", "meta", "model", "nl", "object", "ol", "output",
    "p", "param", "pre", "quote", "range", "rebuild", "recalculate",
    "refresh", "repeat", "reset", "revalidate", "ruby", "samp", "secret",
    "section", "select1", "select", "send", "separator", "setfocus",
    "setindex", "setvalue", "span", "standby", "strong", "style", "sub",
    "submit", "summary", "sup", "switch", "table", "tbody", "td",
    "textarea", "tfoot", "th", "thead", "title", "tr", "trigger",
    "ul", "upload", "var"];

Sanitize.ATTRIBUTES = {
    "a": ["href"],
    "img": ["src"]
};
