/*
  An item (file) that will go into an EPUB
  It has the following properties
      type:  XHTML or image
      sourceUrl: where the html came from
      id:  the id value in the content.opf file

      optional members:
      nodes:  list of nodes that make up the content (if it's XHTML content)
*/
"use strict";

class EpubItem {
    constructor(sourceUrl) {
        this.sourceUrl = sourceUrl;
        this.isInSpine = true;
        this.chapterTitle = null;
    }

    setIndex(index) {
        this.index = index;
    }

    // name of the item in the zip.
    getZipHref() {
        let that = this;
        return util.makeStorageFileName("OEBPS/Text/", that.index, that.chapterTitle, "xhtml");
    }

    getId() {
        return "xhtml" + util.zeroPad(this.index);
    }

    getMediaType() {
        return "application/xhtml+xml";
    }

    hasSvg() {
        if (this.nodes != null) {
            for (let n of this.nodes) {
                if ((n.nodeType === Node.ELEMENT_NODE) &&
                    (n.querySelector("svg") !== null)) {
                    return true;
                }
            }
        }
        return false;
    }

    fileContentForEpub(emptyDocFactory, contentValidator) {
        let xml = util.xmlToString(this.makeChapterDoc(emptyDocFactory));
        let errorMessage = contentValidator(xml);
        if (errorMessage) {
            let errorMsg = chrome.i18n.getMessage("convertToXhtmlWarning", 
                [this.chapterTitle, this.sourceUrl, errorMessage]
            );
            ErrorLog.log(errorMsg);
        }
        return xml;
    }

    packInEpub(zipWriter, emptyDocFactory, contentValidator) {
        let content = this.fileContentForEpub(emptyDocFactory, contentValidator);
        zipWriter.add(this.getZipHref(), new zip.TextReader(content));
    }

    makeChapterDoc(emptyDocFactory) {
        let doc = emptyDocFactory();
        let body = doc.getElementsByTagName("body")[0];
        for (let node of this.nodes) {
            let clean = util.sanitizeNode(node);
            if (clean) {
                body.appendChild(clean);
            }
        }
        this.populateTitle(doc, body);
        delete(this.nodes);
        return doc;
    }

    populateTitle(doc, body) {
        let title = doc.querySelector("title");
        let h1 = body.querySelector("h1");
        if (util.isNullOrEmpty(title.textContent) && (h1 !== null)) {
            title.textContent = h1.textContent;
        }
    }

    // convert type of heading element to nesting depth on Table of Contents
    // H1 = 0, H2 = 1, etc
    tagNameToTocDepth(tagName) {
        // ToDo: assert that tagName in range <h1> ... <h4>
        return tagName[1] - "1";
    }

    *chapterInfo() {
        let that = this;
        for (let element of that.nodes) {
            if (util.isHeaderTag(element)) {
                yield {
                    depth: this.tagNameToTocDepth(element.tagName),
                    title: element.textContent,
                    src: that.getZipHref()
                };
            }
        }
    }

    getHyperlinks() {
        let links = [];
        for (let element of this.nodes) {
            if (element.nodeType === Node.ELEMENT_NODE) {
                if (element.tagName.toLowerCase() === "a") {
                    links.push(element);
                }
                for (let link of element.querySelectorAll("a")) {
                    links.push(link);
                }
            }
        }
        return links;
    }
}

//==============================================================
// Construct an Epub item from source where each chapter 
// was a separate HTML file.
class ChapterEpubItem extends EpubItem { // eslint-disable-line no-unused-vars
    constructor(chapter, content, index) {
        super(chapter.sourceUrl);
        super.setIndex(index);
        this.nodes = Array.from(content.childNodes);
        this.chapterTitle = chapter.title;
        this.newArc = chapter.newArc;
    }

    *chapterInfo() {
        let that = this;

        let isStartOfNewArc = ((that.newArc !== null) && (that.newArc !== undefined));
        if (isStartOfNewArc) {
            yield {
                depth: 0,
                title: that.newArc,
                src: that.getZipHref()
            };
        }

        if (typeof (that.chapterTitle) !== "undefined") {
            yield {
                depth: 1,
                title: that.chapterTitle,
                src: that.getZipHref()
            };
        }
    }
}

//==============================================================
/*
    Details of an image in BakaTsuki web page
    wrappingUrl :  URL of <a> tag that wraps the <img> (For Baka-Tsuki, is a web page that holds list of versions of the image)
    sourceUrl : URL of actual image  (initially, image on page)
    mediaType: jpeg, png, etc.
    arrayBuffer: the image bytes
    isCover :  use this as the cover image?
    height: "full size" image height 
    width: "full size" image width
*/
class ImageInfo extends EpubItem { // eslint-disable-line no-unused-vars
    constructor(wrappingUrl, index, sourceUrl, dataOrigFileUrl) {
        super(sourceUrl);
        super.index = index;
        super.isInSpine = false;
        this.wrappingUrl = wrappingUrl;
        this.mediaType = "image/jpeg";
        this.isCover = false;
        this.isOutsideGallery = false;
        this.arraybuffer = null;
        this.height = null;
        this.width = null;
        this.dataOrigFileUrl = dataOrigFileUrl;
        this.queuedForFetch = false;
    }

    getZipHref() {
        let that = this;
        let suffix = util.getDefaultExtensionByMime(that.mediaType) || that.findImageSuffix(that.wrappingUrl);
        return util.makeStorageFileName("OEBPS/Images/", that.index, that.getImageName(that.wrappingUrl), suffix);
    }

    getBase64(maxLength) {
        var binary = "";
        var bytes = new Uint8Array(this.arraybuffer);
        var len = bytes.byteLength;
        if (maxLength > 0) len = Math.min(len, maxLength);
        for (var i = 0; i < len; i++)
        {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa( binary );
    }

    getId() {
        if (this.isCover) {
            return "cover-image";
        } else {
            return "image" + util.zeroPad(this.index);
        }
    }

    getMediaType() {
        return this.mediaType;
    }

    packInEpub(zipWriter) {
        zipWriter.add(this.getZipHref(),
            new zip.BlobReader(new Blob([this.arraybuffer])));
    }

    findImageSuffix(wrappingUrl) {
        let that = this;
        let suffix = "";
        let fileName = that.extractImageFileNameFromUrl(wrappingUrl);
        if (fileName != null) {
            let index = fileName.lastIndexOf(".");
            suffix = fileName.substring(index + 1);
        }

        // if can't find suffix from file, use the media type
        if (fileName == null) {
            let split = that.mediaType.split("/");
            suffix = split[split.length - 1];

            // special case
            if (suffix === "svg+xml") {
                suffix = "svg";
            }
        }
        return suffix;
    }

    // assume image URL looks like one one of the following
    // https://www.baka-tsuki.org/project/index.php?title=File:HSDxD_v01_cover.jpg
    // https://www.baka-tsuki.org/project/thumb.php?f=HSDxD_v01_cover.gif&width=427
    // https://www.baka-tsuki.org/project/images/7/76/HSDxD_v01_cover.jpg

    // http://sonako.wikia.com/wiki/File:Date4_000c.png
    // http://vignette2.wikia.nocookie.net/sonako/images/d/db/Date4_000c.png/revision/latest?cb=20140821053052
    // http://vignette2.wikia.nocookie.net/sonako/images/d/db/Date4_000c.png/revision/latest/scale-to-width-down/332?cb=20140821053052
    extractImageFileNameFromUrl(url) {
        let parsedUrl = null;
        try {
            parsedUrl = new URL(url);
        } catch (err) {
            return undefined;
        }

        // examine pathname and query
        let temp = parsedUrl.pathname + parsedUrl.search;
        let fileNames = temp.split(/=|&|:|\/|\?/).filter(s => this.isImageFileNameCandidate(s));
        if (0 < fileNames.length) {
            return fileNames[fileNames.length - 1];
        }
    
        // if get here, nothing found
        return undefined;
    }

    // Crude. If string has '.' and is not a .php or .html, 
    // and there's at least 3 characters after the '.'
    // assume it's an image filename
    isImageFileNameCandidate(candidate) {
        let lowerString = candidate.toLowerCase();
        return (4 < lowerString.length) &&
            (lowerString.indexOf(".") !== -1) &&
            (lowerString.indexOf(".html") === -1) &&
            (lowerString.indexOf(".php") === -1) &&
            (4 <= (lowerString.length - lowerString.lastIndexOf(".")));
    }

    getImageName(page) {
        let that = this;
        if (page) {
            let name = that.extractImageFileNameFromUrl(page);
            if (name) {
                return name.split(/\./gi)[0];
            }
        }
        // This is actually wise to do now.
        return undefined;
    }

    createImageElement(userPreferences) {
        if (this.isSvgImageUsedHere(userPreferences)) {
            return util.createSvgImageElement(this.getZipHref(), this.width, this.height, 
                this.wrappingUrl, userPreferences.includeImageSourceUrl.value);
        } else {
            return this.createImgImageElement("div");
        }
    }

    isSvgImageUsedHere(userPreferences) {
        const MIN_SVG_IMAGE_DIMENSION = 300;
        return userPreferences.useSvgForImages.value &&
            MIN_SVG_IMAGE_DIMENSION <= this.width &&
            MIN_SVG_IMAGE_DIMENSION <= this.height;
    }

    createImgImageElement(wrappingTag) {
        let src = this.getZipHref();
        let origin = this.wrappingUrl;
        let doc = util.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let wrapper = doc.createElementNS(util.XMLNS, wrappingTag);
        body.appendChild(wrapper);
        let img = doc.createElementNS(util.XMLNS,"img");
        if (wrappingTag === "span") {
            img.className = "inline";
        }
        img.src = util.makeRelative(src);
        img.alt = "";
        wrapper.appendChild(img);
        wrapper.appendChild(util.createComment(doc, origin));
        return wrapper;
    }

    *chapterInfo() {
        // images do not appear in table of contents
    }
}
