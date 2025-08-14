/*
  Functions for packing an EPUB file
*/
"use strict";

/*
    For our purposes, an EPUB only contains two types of content file: XHTML and image.
    - The HTML files are in reading order (i.e. Appear in same order as spine and table of contents (ToC))
    - If an HTML file entry has a "title" element, it will appear in the ToC
    - Stand-alone images (e.g. Cover) will have an XHTML entry that points to the image.
    - First image, (if there are any) will be the cover image
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
        let zipFileWriter = new zip.BlobWriter("application/epub+zip");
        let zipWriter = new zip.ZipWriter(zipFileWriter,{useWebWorkers: false,compressionMethod: 8, extendedTimestamp: false});
        this.addRequiredFiles(zipWriter);
        zipWriter.add("OEBPS/content.opf", new zip.TextReader(this.buildContentOpf(epubItemSupplier)));
        zipWriter.add("OEBPS/toc.ncx", new zip.TextReader(this.buildTableOfContents(epubItemSupplier)));
        if (this.version === EpubPacker.EPUB_VERSION_3) {
            zipWriter.add("OEBPS/toc.xhtml", new zip.TextReader(this.buildNavigationDocument(epubItemSupplier)));
        }
        this.packContentFiles(zipWriter, epubItemSupplier);
        zipWriter.add(util.styleSheetFileName(), new zip.TextReader(this.metaInfo.styleSheet));
        return zipWriter.close();
    }

    static addExtensionIfMissing(fileName) {
        let extension = ".epub";
        return (fileName.endsWith(extension)) ? fileName : fileName + extension;
    }

    // every EPUB must have a mimetype and a container.xml file
    addRequiredFiles(zipFile) {
        zipFile.add("mimetype",  new zip.TextReader("application/epub+zip"),{compressionMethod: 0});
        zipFile.add("META-INF/container.xml",
            new zip.TextReader("<?xml version=\"1.0\"?>" +
            "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">" +
                "<rootfiles>" +
                    "<rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>" +
                "</rootfiles>" +
            "</container>")
        );
    }

    buildContentOpf(epubItemSupplier) {
        let ns = "http://www.idpf.org/2007/opf";
        let opf = document.implementation.createDocument(ns, "package", null);
        opf.documentElement.setAttributeNS(null, "version", this.version);
        opf.documentElement.setAttributeNS(null, "unique-identifier", "BookId");
        this.buildMetaData(opf, epubItemSupplier);
        this.buildManifest(opf, ns, epubItemSupplier);
        this.buildSpine(opf, ns, epubItemSupplier);
        this.buildGuide(opf, ns, epubItemSupplier);

        return util.xmlToString(opf);
    }

    buildMetaData(opf, epubItemSupplier) {
        let opf_ns = "http://www.idpf.org/2007/opf";
        let dc_ns = "http://purl.org/dc/elements/1.1/";

        let metadata = opf.createElementNS(opf_ns, "metadata");
        metadata.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:dc", dc_ns);
        metadata.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:opf", opf_ns);
        opf.documentElement.appendChild(metadata);
        this.createAndAppendChildNS(metadata, dc_ns, "dc:title", this.metaInfo.title);
        this.createAndAppendChildNS(metadata, dc_ns, "dc:language", this.metaInfo.language);
        this.createAndAppendChildNS(metadata, dc_ns, "dc:date", this.getDateForMetaData());
        if (!util.isNullOrEmpty(this.metaInfo.subject)) {
            this.createAndAppendChildNS(metadata, dc_ns, "dc:subject", this.metaInfo.subject);
        }
        if (!util.isNullOrEmpty(this.metaInfo.description)) {
            this.createAndAppendChildNS(metadata, dc_ns, "dc:description", this.metaInfo.description);
        }

        let author = this.createAndAppendChildNS(metadata, dc_ns, "dc:creator", this.metaInfo.author);
        this.addMetaProperty(metadata, author, "file-as", "creator", this.metaInfo.getFileAuthorAs());
        this.addMetaProperty(metadata, author, "role", "creator", "aut");

        if (this.metaInfo.translator !== null) {
            let translator = this.createAndAppendChildNS(metadata, dc_ns, "dc:contributor", this.metaInfo.translator);
            this.addMetaProperty(metadata, translator, "file-as", "translator", this.metaInfo.translator);
            this.addMetaProperty(metadata, translator, "role", "translator", "trl");
        }

        let idText = (this.version === EpubPacker.EPUB_VERSION_3 ? "uri:" : "") + this.metaInfo.uuid;
        let identifier = this.createAndAppendChildNS(metadata, dc_ns, "dc:identifier", idText);
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
        let contributor = this.createAndAppendChildNS(metadata, dc_ns, "dc:contributor", webToEpubVersion);
        this.addMetaProperty(metadata, contributor, "role", "packingTool", "bkp");

        if (epubItemSupplier.hasCoverImageFile()) {
            this.appendMetaContent(metadata, opf_ns, "cover", epubItemSupplier.coverImageId());
        }

        if (this.metaInfo.seriesName !== null) {
            this.appendMetaContent(metadata, opf_ns, "calibre:series", this.metaInfo.seriesName);
            this.appendMetaContent(metadata, opf_ns, "calibre:series_index", this.metaInfo.seriesIndex);
        }

        for (let i of epubItemSupplier.manifestItems()) {
            let source = this.createAndAppendChildNS(metadata, dc_ns, "dc:source", i.sourceUrl);
            source.setAttributeNS(null, "id", "id." + i.getId());
        }
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
        let meta = this.createAndAppendChildNS(parent, opf_ns, "meta");
        // Some e-book readers such as the Nook fail to recognize covers if the content
        // attribute comes before the name attribute. For maximum compatibility move
        // the name attribute before the content attribute.
        meta.setAttributeNS(null, "name", name);
        meta.setAttributeNS(null, "content", content);
    }
    
    buildManifest(opf, ns, epubItemSupplier) {
        let manifest = this.createAndAppendChildNS(opf.documentElement, ns, "manifest");
        for (let i of epubItemSupplier.manifestItems()) {
            let item = this.addManifestItem(manifest, ns, i.getZipHref(), i.getId(), i.getMediaType());
            this.setSvgPropertyForManifestItem(item, i.hasSvg());
        }

        this.addManifestItem(manifest, ns, util.styleSheetFileName(), "stylesheet", "text/css");
        this.addManifestItem(manifest, ns, "OEBPS/toc.ncx", "ncx", "application/x-dtbncx+xml");
        if (epubItemSupplier.hasCoverImageFile()) {
            let item = this.addManifestItem(manifest, ns, EpubPacker.coverImageXhtmlHref(), EpubPacker.coverImageXhtmlId(), "application/xhtml+xml");
            this.setSvgPropertyForManifestItem(item, this.doesCoverHaveSvg(epubItemSupplier));
        }
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
        let spine = this.createAndAppendChildNS(opf.documentElement, ns, "spine");
        spine.setAttributeNS(null, "toc", "ncx");
        if (epubItemSupplier.hasCoverImageFile()) {
            this.addSpineItemRef(spine, ns, EpubPacker.coverImageXhtmlId());
        }
        for (let item of epubItemSupplier.spineItems()) {
            this.addSpineItemRef(spine, ns, item.getId());
        }
    }

    addSpineItemRef(spine, ns, idref) {
        this.createAndAppendChildNS(spine, ns, "itemref").setAttributeNS(null, "idref", idref);
    }

    buildGuide(opf, ns, epubItemSupplier) {
        if (epubItemSupplier.hasCoverImageFile()) {
            let guide = this.createAndAppendChildNS(opf.documentElement, ns, "guide");
            let reference = this.createAndAppendChildNS(guide, ns, "reference");
            reference.setAttributeNS(null, "href", this.makeRelative(EpubPacker.coverImageXhtmlHref()));
            reference.setAttributeNS(null, "title", "Cover");
            reference.setAttributeNS(null, "type", "cover");
        }
    }

    buildTableOfContents(epubItemSupplier) {
        let ns = "http://www.daisy.org/z3986/2005/ncx/";
        let ncx = document.implementation.createDocument(ns, "ncx", null);
        ncx.documentElement.setAttribute("version", "2005-1");
        ncx.documentElement.setAttribute("xml:lang", this.metaInfo.language);
        let head = this.createAndAppendChildNS(ncx.documentElement, ns, "head");
        this.buildDocTitle(ncx, ns);
        let depth = this.buildNavMap(ncx, ns, epubItemSupplier);
        this.populateHead(head, ns, depth);

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
        this.appendMetaContent(head, ns, "dtb:uid", this.metaInfo.uuid);
        this.appendMetaContent(head, ns, "dtb:depth", (depth < 2) ? "2" : depth);
        this.appendMetaContent(head, ns, "dtb:totalPageCount", "0");
        this.appendMetaContent(head, ns, "dtb:maxPageNumber", "0");
    }

    buildDocTitle(ncx, ns) {
        let docTitle = this.createAndAppendChildNS(ncx.documentElement, ns, "docTitle");
        this.createAndAppendChildNS(docTitle, ns, "text", this.metaInfo.title);
    }

    populateNavElement(nav, ns, epubItemSupplier) {
        let rootParent = this.createAndAppendChildNS(nav, ns, "ol");
        let parents = new NavPointParentElementsStack(rootParent);
        for (let chapterInfo of epubItemSupplier.chapterInfo()) {
            let parent = parents.findParentElement(chapterInfo.depth);
            let nextLevel = this.buildNavListItem(parent, ns, chapterInfo);
            parents.addElement(chapterInfo.depth, nextLevel);
        }
        this.removeEmptyNavLists(rootParent);
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
        let navMap = this.createAndAppendChildNS(ncx.documentElement, ns, "navMap");
        let parents = new NavPointParentElementsStack(navMap);
        let playOrder = 0;
        let id = 0;
        let lastChapterSrc = null;
        for (let chapterInfo of epubItemSupplier.chapterInfo()) {
            let parent = parents.findParentElement(chapterInfo.depth);
            if (lastChapterSrc !== chapterInfo.src) {
                ++playOrder;
            }
            let navPoint = this.buildNavPoint(parent, ns, playOrder, ++id, chapterInfo);
            lastChapterSrc = chapterInfo.src;
            parents.addElement(chapterInfo.depth, navPoint);
        }
        return parents.maxDepth;
    }

    buildNavPoint(parent, ns, playOrder, id, chapterInfo) {
        let navPoint = this.createAndAppendChildNS(parent, ns, "navPoint");
        navPoint.setAttributeNS(null, "id", this.makeId(util.zeroPad(id)));
        navPoint.setAttributeNS(null, "playOrder", playOrder);
        let navLabel = this.createAndAppendChildNS(navPoint, ns, "navLabel");
        this.createAndAppendChildNS(navLabel, ns, "text", chapterInfo.title);
        this.createAndAppendChildNS(navPoint, ns, "content").setAttributeNS(null, "src", this.makeRelative(chapterInfo.src));
        return navPoint;
    }

    packContentFiles(zipWriter, epubItemSupplier) {
        for (let file of epubItemSupplier.files()) {
            file.packInEpub(zipWriter, this.emptyDocFactory, this.contentValidator);
        }
        if (epubItemSupplier.hasCoverImageFile()) {
            let fileContent = epubItemSupplier.makeCoverImageXhtmlFile(this.emptyDocFactory);
            zipWriter.add(EpubPacker.coverImageXhtmlHref(), new zip.TextReader(fileContent));
        }
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
        let index = this.parents.length - 1;
        while (depth <= this.parents[index].depth) {
            --index;
        }
        return this.parents[index].element;
    }

    addElement(depth, element) {
        // discard any elements that are nested >= this one
        while (depth <= this.parents[this.parents.length - 1].depth) {
            this.parents.pop();
        }
        this.parents.push({
            element: element,
            depth: depth
        });
        if (this.maxDepth < this.parents.length - 1) {
            this.maxDepth = this.parents.length - 1;
        }
    }
}
