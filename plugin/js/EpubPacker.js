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
    constructor(metaInfo, version = EpubPacker.EPUB_VERSION_2) {
        this.metaInfo = metaInfo;
        this.version = version;

        this.emptyDocFactory = util.createEmptyXhtmlDoc;
        let contentType = EpubPacker.XHTML_MIME_TYPE;
        if (version === EpubPacker.EPUB_VERSION_3) {
            this.emptyDocFactory = util.createEmptyHtmlDoc;
            contentType = EpubPacker.HTML_MIME_TYPE;
        }
        this.contentValidator = xml => util.isXhtmlInvalid(xml, contentType);
    }

    static coverImageXhtmlHref() {
        return "OEBPS/Text/Cover.xhtml";
    }

    static coverImageXhtmlId() {
        return "cover";
    }

    assemble(epubItemSupplier) {
        let that = this;
        let zipFile = new JSZip();
        that.addRequiredFiles(zipFile);
        zipFile.file("OEBPS/content.opf", that.buildContentOpf(epubItemSupplier), { compression: "DEFLATE" });
        zipFile.file("OEBPS/toc.ncx", that.buildTableOfContents(epubItemSupplier), { compression: "DEFLATE" });
        if (this.version === EpubPacker.EPUB_VERSION_3) {
            zipFile.file("OEBPS/toc.xhtml", that.buildNavigationDocument(epubItemSupplier), { compression: "DEFLATE" });
        }
        that.packXhtmlFiles(zipFile, epubItemSupplier);
        zipFile.file(util.styleSheetFileName(), that.metaInfo.styleSheet, { compression: "DEFLATE" });
        return zipFile.generateAsync({ 
            type: "blob",
            mimeType: "application/epub+zip",
        });
    }

    static addExtensionIfMissing(fileName) {
        let extension = ".epub";
        return (fileName.endsWith(extension)) ? fileName : fileName + extension;
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
        opf.documentElement.setAttributeNS(null, "version", this.version);
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
        if (!util.isNullOrEmpty(that.metaInfo.subject)) {
            that.createAndAppendChildNS(metadata, dc_ns, "dc:subject", that.metaInfo.subject);
        }
        if (!util.isNullOrEmpty(that.metaInfo.description)) {
            that.createAndAppendChildNS(metadata, dc_ns, "dc:description", that.metaInfo.description);
        }

        let author = that.createAndAppendChildNS(metadata, dc_ns, "dc:creator", that.metaInfo.author);
        this.addMetaProperty(metadata, author, "file-as", "creator", that.metaInfo.getFileAuthorAs());
        this.addMetaProperty(metadata, author, "role", "creator", "aut");

        if (that.metaInfo.translator !== null) {
            let translator = that.createAndAppendChildNS(metadata, dc_ns, "dc:contributor", that.metaInfo.translator);
            this.addMetaProperty(metadata, translator, "file-as", "translator", that.metaInfo.translator);
            this.addMetaProperty(metadata, translator, "role", "translator", "trl");
        }

        let identifier = that.createAndAppendChildNS(metadata, dc_ns, "dc:identifier", that.metaInfo.uuid);
        identifier.setAttributeNS(null, "id", "BookId");
        if (this.version === EpubPacker.EPUB_VERSION_2) {
            identifier.setAttributeNS(opf_ns, "opf:scheme", "URI");
        } else {
            this.addMetaProperty(metadata, identifier, "identifier-type", "BookId", "URI");
            let meta = this.createAndAppendChildNS(metadata, opf_ns, "meta");
            meta.setAttributeNS(null, "property", "dcterms:modified");
            let dateWithoutMillisecond = this.getDateForMetaData().substring(0, 19) + "Z";
            meta.textContent = dateWithoutMillisecond;
        }

        let webToEpubVersion = `[https://github.com/dteviot/WebToEpub] (ver. ${util.extensionVersion()})`;
        let contributor = that.createAndAppendChildNS(metadata, dc_ns, "dc:contributor", webToEpubVersion);
        this.addMetaProperty(metadata, contributor, "role", "packingTool", "bkp");

        if (epubItemSupplier.hasCoverImageFile()) {
            that.appendMetaContent(metadata, opf_ns, "cover", epubItemSupplier.coverImageId());
        };

        if (that.metaInfo.seriesName !== null) {
            that.appendMetaContent(metadata, opf_ns, "calibre:series", that.metaInfo.seriesName);
            that.appendMetaContent(metadata, opf_ns, "calibre:series_index", that.metaInfo.seriesIndex);
        }

        for(let i of epubItemSupplier.manifestItems()) {
            let source = this.createAndAppendChildNS(metadata, dc_ns, "dc:source", i.sourceUrl);
            source.setAttributeNS(null, "id", "id." + i.getId());
        };
    }

    addMetaProperty(metadata, element, propName, id, value) {
        let opf_ns = "http://www.idpf.org/2007/opf";
        if (this.version === EpubPacker.EPUB_VERSION_3) {
            element.setAttributeNS(null, "id", id);
            let meta = this.createAndAppendChildNS(metadata, opf_ns, "meta");
            meta.setAttributeNS(null, "refines", "#" +id);
            meta.setAttributeNS(null, "property", propName);
            meta.textContent = value;
        } else {
            element.setAttributeNS(opf_ns, "opf:" + propName, value);
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
        let manifest = that.createAndAppendChildNS(opf.documentElement, ns, "manifest");
        for(let i of epubItemSupplier.manifestItems()) {
            let item = that.addManifestItem(manifest, ns, i.getZipHref(), i.getId(), i.getMediaType());
            this.setSvgPropertyForManifestItem(item, i.hasSvg());
        };

        that.addManifestItem(manifest, ns, util.styleSheetFileName(), "stylesheet", "text/css");
        that.addManifestItem(manifest, ns, "OEBPS/toc.ncx", "ncx", "application/x-dtbncx+xml");
        if (epubItemSupplier.hasCoverImageFile()) {
            let item = that.addManifestItem(manifest, ns, EpubPacker.coverImageXhtmlHref(), EpubPacker.coverImageXhtmlId(), "application/xhtml+xml");
            this.setSvgPropertyForManifestItem(item, this.doesCoverHaveSvg(epubItemSupplier));
        };
        if (this.version === EpubPacker.EPUB_VERSION_3) {
            let item = this.addManifestItem(manifest, ns, "OEBPS/toc.xhtml", "nav", "application/xhtml+xml");
            item.setAttributeNS(null, "properties", "nav");
        }
    }

    addManifestItem(manifest, ns, href, id, mediaType) {
        let item = this.createAndAppendChildNS(manifest, ns, "item");
        let relativeHref = this.makeRelative(href);
        if (mediaType === "image/webp") {
            let errorMsg = chrome.i18n.getMessage("warningWebpImage", [relativeHref]);
            ErrorLog.log(errorMsg);
        }
        item.setAttributeNS(null, "href", relativeHref);
        item.setAttributeNS(null, "id", id);
        item.setAttributeNS(null, "media-type", mediaType);
        return item;
    }

    setSvgPropertyForManifestItem(item, hasSvg) {
        if (hasSvg && (this.version === EpubPacker.EPUB_VERSION_3)) {
            item.setAttributeNS(null, "properties", "svg");
        }
    }

    doesCoverHaveSvg(epubItemSupplier) {
        let fileContent = epubItemSupplier.makeCoverImageXhtmlFile(util.createEmptyXhtmlDoc);
        let doc = new DOMParser().parseFromString(fileContent, "application/xml");
        return (doc.querySelector("svg") != null);
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

    buildNavigationDocument(epubItemSupplier) {
        let ns = "http://www.w3.org/1999/xhtml";
        let navDoc = document.implementation.createDocument(ns, "html", null);
        navDoc.documentElement.setAttribute("xml:lang", this.metaInfo.language);
        navDoc.documentElement.setAttribute("xmlns:epub", "http://www.idpf.org/2007/ops");
        navDoc.documentElement.setAttribute("lang", this.metaInfo.language);
        let head = this.createAndAppendChildNS(navDoc.documentElement, ns, "head");
        this.createAndAppendChildNS(head, ns, "title").textContent = "Table of Contents";
        this.addDocType(navDoc);
        let body = this.createAndAppendChildNS(navDoc.documentElement, ns, "body");
        let nav = this.createAndAppendChildNS(body, ns, "nav");
        nav.setAttribute("epub:type", "toc");
        nav.setAttribute("id", "toc");
        this.populateNavElement(nav, ns, epubItemSupplier);
        return util.xmlToString(navDoc);
    }

    addDocType(navDoc) {
        let docTypeNode = navDoc.implementation.createDocumentType("html", "", "");
        navDoc.insertBefore(docTypeNode, navDoc.childNodes[0]);
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

    populateNavElement(nav, ns, epubItemSupplier) {
        let rootParent = this.createAndAppendChildNS(nav, ns, "ol");
        let parents = new NavPointParentElementsStack(rootParent);
        for(let chapterInfo of epubItemSupplier.chapterInfo()) {
            let parent = parents.findParentElement(chapterInfo.depth);
            let nextLevel = this.buildNavListItem(parent, ns, chapterInfo);
            parents.addElement(chapterInfo.depth, nextLevel);
        }
        this.removeEmptyNavLists(rootParent)
    }

    buildNavListItem(parent, ns, chapterInfo) {
        let li = this.createAndAppendChildNS(parent, ns, "li");
        let link = this.createAndAppendChildNS(li, ns, "a");
        link.href = this.makeRelative(chapterInfo.src);
        link.textContent = chapterInfo.title;
        return this.createAndAppendChildNS(li, ns, "ol");
    }

    removeEmptyNavLists(rootParent) {
        for (let list of rootParent.querySelectorAll("ol")) {
            if (list.childElementCount === 0) {
                list.remove();
            }
        }
    }

    buildNavMap(ncx, ns, epubItemSupplier) {
        let that = this;
        let navMap = that.createAndAppendChildNS(ncx.documentElement, ns, "navMap");
        let parents = new NavPointParentElementsStack(navMap);
        let playOrder = 0;
        let id = 0;
        let lastChapterSrc = null;
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
        let zipOptions = { compression: "DEFLATE" };
        for(let file of epubItemSupplier.files()) {
            let content = file.fileContentForEpub(this.emptyDocFactory, this.contentValidator);
            zipFile.file(file.getZipHref(), content, zipOptions);
        };
        if (epubItemSupplier.hasCoverImageFile()) {
            let fileContent = epubItemSupplier.makeCoverImageXhtmlFile(this.emptyDocFactory);
            zipFile.file(EpubPacker.coverImageXhtmlHref(), fileContent, zipOptions);
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

EpubPacker.EPUB_VERSION_2 = "2.0";
EpubPacker.EPUB_VERSION_3 = "3.0";
EpubPacker.XHTML_MIME_TYPE = "application/xml";
EpubPacker.HTML_MIME_TYPE = "text/html";

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
