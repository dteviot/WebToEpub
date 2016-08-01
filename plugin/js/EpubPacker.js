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
class EpubPacker {
    constructor(metaInfo) {
        let that = this;
        that.metaInfo = metaInfo;
    }

    static coverImageXhtmlHref() {
        return "OEBPS/Text/Cover.xhtml";
    }

    static coverImageXhtmlId() {
        return "cover";
    }

    assembleAndSave(fileName, epubItemSupplier) {
        let that = this;
        let zipFile = new JSZip();
        that.addRequiredFiles(zipFile);
        zipFile.file("OEBPS/content.opf", that.buildContentOpf(epubItemSupplier), { compression: "DEFLATE" });
        zipFile.file("OEBPS/toc.ncx", that.buildTableOfContents(epubItemSupplier), { compression: "DEFLATE" });
        that.packXhtmlFiles(zipFile, epubItemSupplier);
        zipFile.file(util.styleSheetFileName(), that.metaInfo.styleSheet, { compression: "DEFLATE" });
        zipFile.generateAsync({ type: "blob" }).then(function(content) {
            EpubPacker.save(content, fileName);
        });
    }

    // write blob to "Downloads" directory
    static save(blob, fileName) {
        var clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.dispatchEvent(clickEvent);
    }

    // every EPUB must have a mimetype and a container.xml file
    addRequiredFiles(zipFile) {
        zipFile.file("mimetype", "application/epub+zip");
        zipFile.file("META-INF/container.xml",
            "<?xml version=\"1.0\"?>" +
            "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">" +
                "<rootfiles>" +
                    "<rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>" +
                "</rootfiles>" +
            "</container>"
        );
    }

    buildContentOpf(epubItemSupplier) {
        let that = this;
        let ns = "http://www.idpf.org/2007/opf";
        let opf = document.implementation.createDocument(ns, "package", null);
        opf.documentElement.setAttributeNS(null, "version", "2.0");
        opf.documentElement.setAttributeNS(null, "unique-identifier", "BookId");
        that.buildMetaData(opf, epubItemSupplier);
        that.buildManifest(opf, ns, epubItemSupplier);
        that.buildSpine(opf, ns, epubItemSupplier);
        that.buildGuide(opf, ns, epubItemSupplier);

        return util.xmlToString(opf);
    }

    buildMetaData(opf, epubItemSupplier) {
        let that = this;
        let opf_ns = "http://www.idpf.org/2007/opf";
        let dc_ns = "http://purl.org/dc/elements/1.1/";

        let metadata = opf.createElementNS(opf_ns, "metadata");
        metadata.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:dc", dc_ns);
        metadata.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:opf", opf_ns);
        opf.documentElement.appendChild(metadata);
        that.createAndAppendChildNS(metadata, dc_ns, "dc:title", that.metaInfo.title);
        that.createAndAppendChildNS(metadata, dc_ns, "dc:language", that.metaInfo.language);
        that.createAndAppendChildNS(metadata, dc_ns, "dc:date", that.getDateForMetaData());

        let author = that.createAndAppendChildNS(metadata, dc_ns, "dc:creator", that.metaInfo.author);
        author.setAttributeNS(opf_ns, "opf:file-as", that.metaInfo.getFileAuthorAs());
        author.setAttributeNS(opf_ns, "opf:role", "aut");

        if (that.metaInfo.translator !== null) {
            let translator = that.createAndAppendChildNS(metadata, dc_ns, "dc:contributor", that.metaInfo.translator);
            translator.setAttributeNS(opf_ns, "opf:file-as", that.metaInfo.translator);
            translator.setAttributeNS(opf_ns, "opf:role", "trl");
        }

        let identifier = that.createAndAppendChildNS(metadata, dc_ns, "dc:identifier", that.metaInfo.uuid);
        identifier.setAttributeNS(null, "id", "BookId");
        identifier.setAttributeNS(opf_ns, "opf:scheme", "URI");

        if (epubItemSupplier.hasCoverImageFile()) {
            that.appendMetaContent(metadata, opf_ns, "cover", epubItemSupplier.coverImageId());
        };

        if (that.metaInfo.seriesName !== null) {
            that.appendMetaContent(metadata, opf_ns, "calibre:series", that.metaInfo.seriesName);
            that.appendMetaContent(metadata, opf_ns, "calibre:series_index", that.metaInfo.seriesIndex);
        }
    }

    appendMetaContent(parent, opf_ns, name, content) {
        let that = this;
        let meta = that.createAndAppendChildNS(parent, opf_ns, "meta");
        meta.setAttributeNS(null, "content", content);
        meta.setAttributeNS(null, "name", name);
    }
    
    buildManifest(opf, ns, epubItemSupplier) {
        let that = this;
        var manifest = that.createAndAppendChildNS(opf.documentElement, ns, "manifest");
        for(let item of epubItemSupplier.manifestItems()) {
            that.addManifestItem(manifest, ns, item.getZipHref(), item.getId(), item.getMediaType());
        };

        that.addManifestItem(manifest, ns, util.styleSheetFileName(), "stylesheet", "text/css");
        that.addManifestItem(manifest, ns, "OEBPS/toc.ncx", "ncx", "application/x-dtbncx+xml");
        if (epubItemSupplier.hasCoverImageFile()) {
            that.addManifestItem(manifest, ns, EpubPacker.coverImageXhtmlHref(), EpubPacker.coverImageXhtmlId(), "application/xhtml+xml");
        };
    }

    addManifestItem(manifest, ns, href, id, mediaType) {
        let that = this;
        var item = that.createAndAppendChildNS(manifest, ns, "item");
        item.setAttributeNS(null, "href", that.makeRelative(href));
        item.setAttributeNS(null, "id", id);
        item.setAttributeNS(null, "media-type", mediaType);
    }

    buildSpine(opf, ns, epubItemSupplier) {
        let that = this;
        let spine = that.createAndAppendChildNS(opf.documentElement, ns, "spine");
        spine.setAttributeNS(null, "toc", "ncx");
        if (epubItemSupplier.hasCoverImageFile()) {
            that.addSpineItemRef(spine, ns, EpubPacker.coverImageXhtmlId());
        };
        for(let item of epubItemSupplier.spineItems()) {
            that.addSpineItemRef(spine, ns, item.getId());
        };
    }

    addSpineItemRef(spine, ns, idref) {
        this.createAndAppendChildNS(spine, ns, "itemref").setAttributeNS(null, "idref", idref);
    }

    buildGuide(opf, ns, epubItemSupplier) {
        let that = this;
        if (epubItemSupplier.hasCoverImageFile()) {
            let guide = that.createAndAppendChildNS(opf.documentElement, ns, "guide");
            let reference = that.createAndAppendChildNS(guide, ns, "reference");
            reference.setAttributeNS(null, "href", that.makeRelative(EpubPacker.coverImageXhtmlHref()));
            reference.setAttributeNS(null, "title", "Cover");
            reference.setAttributeNS(null, "type", "cover");
        };
    }

    buildTableOfContents(epubItemSupplier) {
        let that = this;
        let ns = "http://www.daisy.org/z3986/2005/ncx/";
        let ncx = document.implementation.createDocument(ns, "ncx", null);
        ncx.documentElement.setAttribute("version", "2005-1");
        ncx.documentElement.setAttribute("xml:lang", that.metaInfo.language);
        let head = that.createAndAppendChildNS(ncx.documentElement, ns, "head");
        that.buildDocTitle(ncx, ns);
        let depth = that.buildNavMap(ncx, ns, epubItemSupplier);
        that.populateHead(head, ns, depth);

        return util.xmlToString(ncx);
    }

    populateHead(head, ns, depth) {
        let that = this;
        that.buildHeadMeta(head, ns, that.metaInfo.uuid, "dtb:uid");
        that.buildHeadMeta(head, ns, (depth < 2) ? "2" : depth, "dtb:depth");
        that.buildHeadMeta(head, ns, "0", "dtb:totalPageCount");
        that.buildHeadMeta(head, ns, "0", "dtb:maxPageNumber");
    }

    buildHeadMeta(head, ns, content, name) {
        let that = this;
        let meta = that.createAndAppendChildNS(head, ns, "meta");
        meta.setAttributeNS(null, "content", content);
        meta.setAttributeNS(null, "name", name);
    }

    buildDocTitle(ncx, ns) {
        let that = this;
        let docTitle = that.createAndAppendChildNS(ncx.documentElement, ns, "docTitle");
        that.createAndAppendChildNS(docTitle, ns, "text", that.metaInfo.title);
    }

    buildNavMap(ncx, ns, epubItemSupplier) {
        let that = this;
        let navMap = that.createAndAppendChildNS(ncx.documentElement, ns, "navMap");
        let parents = new NavPointParentElementsStack(navMap);
        let playOrder = 0;
        let id = 0;
        var lastChapterSrc = null;
        for(let chapterInfo of epubItemSupplier.chapterInfo()) {
            let parent = parents.findParentElement(chapterInfo.depth);
            if(lastChapterSrc !== chapterInfo.src){
                ++playOrder;
            }
            let navPoint = that.buildNavPoint(parent, ns, playOrder, ++id, chapterInfo);
            lastChapterSrc = chapterInfo.src;
            parents.addElement(chapterInfo.depth, navPoint);
        };
        return parents.maxDepth;
    }

    buildNavPoint(parent, ns, playOrder, id, chapterInfo) {
        let that = this;
        let navPoint = that.createAndAppendChildNS(parent, ns, "navPoint");
        navPoint.setAttributeNS(null, "id", that.makeId(util.zeroPad(id)));
        navPoint.setAttributeNS(null, "playOrder", playOrder);
        let navLabel = that.createAndAppendChildNS(navPoint, ns, "navLabel");
        that.createAndAppendChildNS(navLabel, ns, "text", chapterInfo.title);
        that.createAndAppendChildNS(navPoint, ns, "content").setAttributeNS(null, "src", that.makeRelative(chapterInfo.src));
        return navPoint;
    }

    packXhtmlFiles(zipFile, epubItemSupplier) {
        let that = this;
        let zipOptions = { compression: "DEFLATE" };
        for(let file of epubItemSupplier.files()) {
            zipFile.file(file.getZipHref(), file.fileContentForEpub(), zipOptions);
        };
        if (epubItemSupplier.hasCoverImageFile()) {
            zipFile.file(EpubPacker.coverImageXhtmlHref(), epubItemSupplier.makeCoverImageXhtmlFile(), zipOptions);
        };
    }

    createAndAppendChildNS(element, ns, name, data) {
        let child = element.ownerDocument.createElementNS(ns, name);
        if (typeof data  !== "undefined") {
            child.appendChild(element.ownerDocument.createTextNode(data));
        }
        element.appendChild(child);
        return child;
    }

    makeId(id) {
        return "body" + id;
    }
    // changes href to be relative to manifest (and toc.ncx)
    // which are in OEBPS
    makeRelative(href) {
        return href.substr(6);
    }

    /// hook point for unit testing (because we can't control the actual time)
    /// return time string to put into <date> element of metadata
    getDateForMetaData() {
        return new Date().toISOString();
    }
}

/*
  Class to make sure we correctly nest the NavPoint elements
  in the table of contents
*/
class NavPointParentElementsStack {
    constructor(navMap) {
        this.parents = [];
        this.parents.push({
            element: navMap,
            depth: -1
        });
        this.maxDepth = 0;
    }

    findParentElement(depth) {
        let that = this;
        let index = that.parents.length - 1;
        while (depth <= that.parents[index].depth) {
            --index;
        };
        return that.parents[index].element;
    }

    addElement(depth, element) {
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
}
