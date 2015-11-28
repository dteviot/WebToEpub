/*
  Parses files on archiveofourown.net
*/
"use strict";

function Parser() {
}

Parser.prototype = {
   getEpubMetaInfo: function (dom){
        let that = this;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = dom.baseURI;
        metaInfo.title = that.extractTitle(dom);
        metaInfo.author = that.extractAuthor(dom);
        metaInfo.language = that.extractLanguage(dom);
        return metaInfo;
   },

    makeChapterDoc: function(dom) {
        let that = this;
        let util = new Util();
        let doc = util.createEmptyXhtmlDoc();
        util.addToDocBody(doc, that.extractContent(dom));
        return doc;
    },

    getElements: function(dom, tagName, filter) {
        return Array.prototype.slice.apply(dom.getElementsByTagName(tagName)).filter(filter);
    },

    getElement: function(dom, tagName, filter) {
        let elements = this.getElements(dom, tagName, filter);
        return (elements.length === 0) ? null : elements[0];
    },

    // extract hostname from a URL
    extractHostName: function (url) {
        let parser = document.createElement("a");
        parser.href = url;
        return parser.hostname;
    },

    getBaseUrl: function (dom) {
        return Array.prototype.slice.apply(dom.getElementsByTagName("base"))[0].href;
    },
}
