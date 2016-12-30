/*
  Parses files on sonako.org
*/
"use strict";

parserFactory.register("sonako.wikia.com", function() { return new SonakoParser() });

//-----------------------------------------------------------------------------
// class SonakoImageCollector  (derives from ImageCollector)
//-----------------------------------------------------------------------------

class SonakoImageCollector extends BakaTsukiImageCollector {
    constructor() {
        super();
    }

    //  Assume all images can be found on a web page with URL
    //  http://sonako.wikia.com/wiki/File:{data-image-name}
    //  where {data-image-name} is data-image-name element of the img tag.
    //
    extractWrappingUrl(element) {
        let tagName = element.tagName.toLowerCase();
        if (tagName === "a") {
            return element.href;
        }
        let link = util.getElement(element, "a");
        if (link !== null) {
            return link.href;
        };
        let img = (tagName === "img") ? element : util.getElement(element, "img");
        let dataImageName = img.getAttribute("data-image-name");

        // ToDo, use utilresolveRelativeUrl() rather than string concatanation
        return (dataImageName === null) ? img.src : "http://sonako.wikia.com/wiki/File:" + dataImageName;
    }

    isImageWrapperElement(element) {
        return (element.tagName === "FIGURE") ||  super.isImageWrapperElement(element);
    }
}

//-----------------------------------------------------------------------------
// class SonakoParser
//-----------------------------------------------------------------------------

class SonakoParser extends BakaTsukiParser {
    constructor() {
        super(new SonakoImageCollector());
    }

    extractTitle(dom) {
        return dom.title;
    }

    extractLanguage(dom) {   // eslint-disable-line no-unused-vars
        // ToDo find language
        return "vi-VN";
    }

    extractSeriesInfo(dom, metaInfo) {   // eslint-disable-line no-unused-vars
        // This parser does not currently support this functionality
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", e => (e.className.startsWith("mw-content-ltr")));
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(util.getElements(element, "script"));
        util.removeElements(util.getElements(element, "noscript"));

        // discard table of contents (will generate one from tags later)
        util.removeElements(util.getElements(element, "div", e => (e.id === "toc-wrapper")));
        util.removeElements(util.getElements(element, "a", e => (e.className === "toc-link")));

        util.removeElements(util.getElements(element, "a", e => e.className.startsWith("wikia-photogallery-add")));
        util.removeElements(util.getElements(element, "div", e => (e.className ==="print-no")));
        util.removeElements(util.getElements(element, "div", e => (e.id.startsWith("INCONTENT"))));


        util.removeComments(element);
        util.removeElements(util.getElements(element, "table"));

        // hyperlinks that allow editing text
        util.removeElements(util.getElements(element, "span", e => (e.className === "editsection")));

        // fix source for delay loaded image tags
        for(let img of util.getElements(element, "img", e => e.src.startsWith("data:image"))) {
            let href = img.getAttribute("data-src");
            if (href != null) {
                img.src = href;
            };
        };
    }
}
