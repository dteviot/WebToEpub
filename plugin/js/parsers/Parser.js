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
        metaInfo.fileName = that.makeFileName(metaInfo.title);
        return metaInfo;
   },

    makeChapterDoc: function(dom) {
        let that = this;
        let doc = util.createEmptyXhtmlDoc();
        let content = that.findContent(dom)
        if (content != null) {
            util.addToDocBody(doc, content.cloneNode(true));
        }
        return doc;
    },

    getElements: function(dom, tagName, filter) {
        let array = Array.prototype.slice.apply(dom.getElementsByTagName(tagName));
        return (filter == undefined) ? array : array.filter(filter)
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

    // Name to save file as. Default is strip spaces from title and add ".epub" extension.
    makeFileName: function(title) {
        if (title == null) {
            return "web.epub";
        } else {
            // strip spaces
            title = title.replace(/\s+/g, "");

            // replace characters that are not legal in filenames
            // ToDo: add rest of illegal chars.
            title = title.replace(/:|\?|\*|\\/g, "-")

            // append suffix
            return title + ".epub";
        }
    },

    epubItemSupplier: function (chapters) {
        let supplier = new EpubItemSupplier(this);
        supplier.setChapters(chapters);
        return supplier;
    },

    appendColumnDataToRow: function (row, textData) {
        let col = document.createElement("td");
        col.innerText = textData;
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    },

    populateChapterUrls: function (chapters) {
        let that = this;
        let linksTable = document.getElementById("chapterUrlsTable");
        while (linksTable.children.length > 1) {
            linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
        }
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            that.appendColumnDataToRow(row, chapter.title);
            chapter.stateColumn = that.appendColumnDataToRow(row, "No");
            that.appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
        });
    },

    // called when plugin has obtained the first web page
    onLoadFirstPage: function (url, firstPageDom) {
        let that = this;
        let chapters = that.getChapterUrls(firstPageDom);
        that.populateChapterUrls(chapters);
        if ((0 < chapters.length) && (chapters[0].sourceUrl === url)) {
            chapters[0].rawDom = firstPageDom;

            // ToDo: this call is broken until updateLoadState is moved into this class from main.js.
            updateLoadState(chapters[0]);
        }
        return chapters;
    },

    populateUI: function () {
        // ToDO: add controls for typical parser
    }
}
