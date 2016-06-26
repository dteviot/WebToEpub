/*
  Functions for packing an EPUB file
*/
"use strict";

/*
    For our purposes, an EPUB only contains two types of content file: XHTML and image.
    - The HTML files are in reading order (i.e. Appear in same order as spine and table of contents (ToC))
    - If a HTML file entry has a "title" element, it will appear in the ToC
    - Stand alone images (e.g. Cover) will have a XHTML entry that points to the image.
    - First image, (if there are any) is be the cover image
*/

/// <param name="uuid" type="string">identifier for this EPUB.  (i.e. "origin" URL story was downloaded from)</param>
/// <param name="title" type="string">The Title of the story</param>
/// <param name="author" type="string">The writer of the story</param>
function EpubPacker(metaInfo) {
    let that = this;
    that.metaInfo = metaInfo;
}

EpubPacker.coverImageXhtmlHref = function() {
    return "OEBPS/Text/Cover.xhtml";
}

EpubPacker.coverImageXhtmlId = function() {
    return "cover";
}

EpubPacker.prototype = {

    assembleAndSave: function (fileName, epubItemSupplier) {
        let that = this;
        that.save(that.assemble(epubItemSupplier), fileName);
    },

    assemble: function (epubItemSupplier) {
        let that = this;
        let zipFile = new JSZip();
        that.addRequiredFiles(zipFile);
        zipFile.file("OEBPS/content.opf", that.buildContentOpf(epubItemSupplier), { compression: "DEFLATE" });
        zipFile.file("OEBPS/toc.ncx", that.buildTableOfContents(epubItemSupplier), { compression: "DEFLATE" });
        that.packXhtmlFiles(zipFile, epubItemSupplier);
        return zipFile.generate({ type: "blob" });
    },

    // write blob to "Downloads" directory
    save: function (blob, fileName) {
        var clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.dispatchEvent(clickEvent);
    },

    // every EPUB must have a mimetype and a container.xml file
    addRequiredFiles: function(zipFile) {
        zipFile.file("mimetype", "application/epub+zip");
        zipFile.file("META-INF/container.xml",
            "<?xml version=\"1.0\"?>" +
            "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">" +
                "<rootfiles>" +
                    "<rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>" +
                "</rootfiles>" +
            "</container>"
        );
    },

    buildContentOpf: function (epubItemSupplier) {
        let that = this;
        let ns = "http://www.idpf.org/2007/opf";
        let opf = document.implementation.createDocument(ns, "package", null);
        opf.documentElement.setAttribute("version", "2.0");
        opf.documentElement.setAttribute("unique-identifier", "BookId");
        that.buildMetaData(opf, epubItemSupplier);
        that.buildManifest(opf, epubItemSupplier);
        that.buildSpine(opf, epubItemSupplier);
        that.buildGuide(opf, epubItemSupplier);

        return util.xmlToString(opf);
    },

    buildMetaData: function (opf, epubItemSupplier) {
        let that = this;
        var metadata = that.createAndAppendChild(opf.documentElement, "metadata");
        metadata.setAttribute("xmlns:dc", "http://purl.org/dc/elements/1.1/");
        metadata.setAttribute("xmlns:opf", "http://www.idpf.org/2007/opf");

        that.createAndAppendChild(metadata, "dc:title", that.metaInfo.title);
        that.createAndAppendChild(metadata, "dc:language", that.metaInfo.language);
        that.createAndAppendChild(metadata, "dc:date", that.getDateForMetaData());

        let author = that.createAndAppendChild(metadata, "dc:creator", that.metaInfo.author);
        author.setAttribute("opf:file-as", that.metaInfo.author);
        author.setAttribute("opf:role", "aut");

        let identifier = that.createAndAppendChild(metadata, "dc:identifier", that.metaInfo.uuid);
        identifier.setAttribute("id", "BookId");
        identifier.setAttribute("opf:scheme", "URI");

        if (epubItemSupplier.hasCoverImageFile()) {
            that.appendMetaContent(metadata, "cover", epubItemSupplier.coverImageId());
        };

        let seriesInfo = that.metaInfo.seriesInfo;
        if (seriesInfo !== null) {
            that.appendMetaContent(metadata, "calibre:series", seriesInfo.name);
            that.appendMetaContent(metadata, "calibre:series_index", seriesInfo.seriesIndex);
        }
    },

    appendMetaContent: function(parent, name, content) {
        let that = this;
        let meta = that.createAndAppendChild(parent, "meta");
        meta.setAttribute("content", content);
        meta.setAttribute("name", name);
    },
    
    buildManifest: function (opf, epubItemSupplier) {
        let that = this;
        var manifest = that.createAndAppendChild(opf.documentElement, "manifest");
        for(let item of epubItemSupplier.manifestItems()) {
            that.addManifestItem(manifest, item.href, item.id, item.mediaType);
        };

        that.addManifestItem(manifest, "OEBPS/toc.ncx", "ncx", "application/x-dtbncx+xml");
        if (epubItemSupplier.hasCoverImageFile()) {
            that.addManifestItem(manifest, EpubPacker.coverImageXhtmlHref(), EpubPacker.coverImageXhtmlId(), "application/xhtml+xml");
        };
    },

    addManifestItem: function(manifest, href, id, mediaType) {
        let that = this;
        var item = that.createAndAppendChild(manifest, "item");
        item.setAttribute("href", that.makeRelative(href));
        item.setAttribute("id", id);
        item.setAttribute("media-type", mediaType);
    },

    buildSpine: function (opf, epubItemSupplier) {
        let that = this;
        let spine = that.createAndAppendChild(opf.documentElement, "spine");
        spine.setAttribute("toc", "ncx");
        if (epubItemSupplier.hasCoverImageFile()) {
            that.addSpineItemRef(spine, EpubPacker.coverImageXhtmlId());
        };
        for(let item of epubItemSupplier.spineItems()) {
            that.addSpineItemRef(spine, item.id);
        };
    },

    addSpineItemRef: function(spine, idref) {
        this.createAndAppendChild(spine, "itemref").setAttribute("idref", idref);
    },

    buildGuide: function (opf, epubItemSupplier) {
        let that = this;
        if (epubItemSupplier.hasCoverImageFile()) {
            let guide = that.createAndAppendChild(opf.documentElement, "guide");
            let reference = that.createAndAppendChild(guide, "reference");
            reference.setAttribute("href", that.makeRelative(EpubPacker.coverImageXhtmlHref()));
            reference.setAttribute("title", "Cover");
            reference.setAttribute("type", "cover");
        };
    },

    buildTableOfContents: function (epubItemSupplier) {
        let that = this;
        let ns = "http://www.daisy.org/z3986/2005/ncx/";
        let ncx = document.implementation.createDocument(ns, "ncx", null);
        ncx.documentElement.setAttribute("version", "2005-1");
        ncx.documentElement.setAttribute("xml:lang", that.metaInfo.language);
        let head = that.createAndAppendChild(ncx.documentElement, "head");
        that.buildDocTitle(ncx);
        let depth = that.buildNavMap(ncx, epubItemSupplier);
        that.populateHead(ncx, head, depth);

        return util.xmlToString(ncx);
    },

    populateHead: function (ncx, head, depth) {
        let that = this;
        that.buildHeadMeta(head, that.metaInfo.uuid, "dtb:uid");
        that.buildHeadMeta(head, (depth < 2) ? "2" : depth, "dtb:depth");
        that.buildHeadMeta(head, "0", "dtb:totalPageCount");
        that.buildHeadMeta(head, "0", "dtb:maxPageNumber");
    },

    buildHeadMeta: function (head, content, name) {
        let that = this;
        let meta = that.createAndAppendChild(head, "meta");
        meta.setAttribute("content", content);
        meta.setAttribute("name", name);
    },

    buildDocTitle: function (ncx) {
        let that = this;
        let docTitle = that.createAndAppendChild(ncx.documentElement, "docTitle");
        that.createAndAppendChild(docTitle, "text", that.metaInfo.title);
    },

    buildNavMap: function (ncx, epubItemSupplier) {
        let that = this;
        let navMap = that.createAndAppendChild(ncx.documentElement, "navMap");
        let parents = new NavPointParentElementsStack(navMap);
        let playOrder = 0;
        for(let chapterInfo of epubItemSupplier.chapterInfo()) {
            let parent = parents.findParentElement(chapterInfo.depth);
            let navPoint = that.buildNavPoint(parent, ++playOrder, chapterInfo);
            parents.addElement(chapterInfo.depth, navPoint);
        };
        return parents.maxDepth;
    },

    buildNavPoint: function (parent, playOrder, chapterInfo) {
        let that = this;
        let navPoint = that.createAndAppendChild(parent, "navPoint");
        navPoint.setAttribute("id", that.makeId(util.zeroPad(playOrder)));
        navPoint.setAttribute("playOrder", playOrder);
        let navLabel = that.createAndAppendChild(navPoint, "navLabel");
        that.createAndAppendChild(navLabel, "text", chapterInfo.title);
        that.createAndAppendChild(navPoint, "content").setAttribute("src", that.makeRelative(chapterInfo.src));
        return navPoint;
    },

    packXhtmlFiles: function (zipFile, epubItemSupplier) {
        let that = this;
        let zipOptions = { compression: "DEFLATE" };
        for(let file of epubItemSupplier.files()) {
            zipFile.file(file.href, file.content, zipOptions);
        };
        if (epubItemSupplier.hasCoverImageFile()) {
            zipFile.file(EpubPacker.coverImageXhtmlHref(), epubItemSupplier.makeCoverImageXhtmlFile(), zipOptions);
        };
    },

    createAndAppendChild: function (element, name, data) {
        let child = element.ownerDocument.createElement(name);
        if (typeof data  !== "undefined") {
            child.appendChild(element.ownerDocument.createTextNode(data));
        }
        element.appendChild(child);
        return child;
    },

    makeId: function (id) {
        return "body" + id;
    },
    // changes href to be relative to manifest (and toc.ncx)
    // which are in OEBPS
    makeRelative: function (href) {
        return href.substr(6);
    },

    /// hook point for unit testing (because we can't control the actual time)
    /// return time string to put into <date> element of metadata
    getDateForMetaData: function () {
        return new Date().toISOString();
    }
}

/*
  Class to make sure we correctly nest the NavPoint elements
  in the table of contents
*/
function NavPointParentElementsStack(navMap) {
    this.parents = [];
    this.parents.push({
        element: navMap,
        depth: -1
    });
    this.maxDepth = 0;
}

NavPointParentElementsStack.prototype.findParentElement = function(depth) {
    let that = this;
    let index = that.parents.length - 1;
    while (depth <= that.parents[index].depth) {
        --index;
    };
    return that.parents[index].element;
}

NavPointParentElementsStack.prototype.addElement = function(depth, element) {
    let that = this;
    // discard any elements that are nested >= this one
    while (depth <= that.parents[that.parents.length - 1].depth) {
        that.parents.pop();
    }
    that.parents.push({
        element: element,
        depth: depth
    });
    if (that.maxDepth < that.parents.length - 1) {
        that.maxDepth = that.parents.length - 1;
    }
}
