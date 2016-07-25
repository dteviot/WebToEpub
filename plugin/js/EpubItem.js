/*
  An item (file) that will go into an EPUB
  It has the following properties
      type:  XHTML or image
      sourceUrl: where the html came from
      id:  the id value in the content.opf file

      optional elements:
      elements:  list of elements that make up the content (if it's XHTML content)
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

    fileContentForEpub() {
        return util.xmlToString(this.makeChapterDoc());
    }


    makeChapterDoc() {
        let that = this;
        let doc = util.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        for(let element of that.elements) {
            body.appendChild(doc.importNode(element, true));
        };
        return doc;
    }

    // convert type of heading element to nesting depth on Table of Contents
    // H1 = 0, H2 = 1, etc
    tagNameToTocDepth(tagName) {
        // ToDo: assert that tagName in range <h1> ... <h4>
        return tagName[1] - '1';
    }
}

EpubItem.prototype.chapterInfo = function*() {
    let that = this;
    for(let element of that.elements) {
        if (util.isHeaderTag(element)) {
            yield {
                depth: this.tagNameToTocDepth(element.tagName),
                title: element.textContent,
                src: that.getZipHref()
            };
        };
    };
}

//==============================================================
// Construct an Epub item from source where each chapter 
// was a separate HTML file.
class ChapterEpubItem extends EpubItem {
    constructor(chapter, content, index) {
        super(chapter.sourceUrl);
        super.setIndex(index);
        this.elements = [ content ];
        this.chapterTitle = chapter.title;
    }
}

ChapterEpubItem.prototype.chapterInfo = function*() {
    let that = this;
    if (typeof (that.chapterTitle) !== "undefined") {
        yield {
            depth: 0,
            title: that.chapterTitle,
            src: that.getZipHref()
        }
    }
}

//==============================================================
/*
    Details of an image in BakaTsuki web page
    imagePageUrl :  URL of web page that holds list of versions of the image
    sourceUrl : URL of actual image  (initially, image on page)
    mediaType: jpeg, png, etc.
    arrayBuffer: the image bytes
    isCover :  use this as the cover image?
    height: "full size" image height 
    width: "full size" image width
*/
class ImageInfo extends EpubItem {
    constructor(imagePageUrl, index, sourceUrl) {
        super(sourceUrl);
        // ToDo:  This will need to derive from EpubItem
        let that = this;
        super.index = index;
        super.isInSpine = false;
        this.imagePageUrl = imagePageUrl;
        this.mediaType = "image/jpeg";
        this.isCover = false;
        this.isOutsideGallery = false;
        this.arraybuffer = null;
        this.height = null;
        this.width = null;
    }

    getZipHref() {
        let that = this;
        let suffix = that.findImageSuffix(that.imagePageUrl);
        return util.makeStorageFileName("OEBPS/Images/", that.index, that.getImageName(that.imagePageUrl), suffix);
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

    fileContentForEpub() {
        return this.arraybuffer;
    }
}

ImageInfo.prototype.findImageSuffix = function(imagePageUrl) {
    let that = this;
    let suffix = "";
    let fileName = that.extractImageFileNameFromUrl(imagePageUrl)
    if (fileName != null) {
        let index = fileName.lastIndexOf(".");
        suffix = fileName.substring(index + 1);
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
ImageInfo.prototype.extractImageFileNameFromUrl = function(url) {
    let that = this;
    let temp = url;
    
    // remove everything after hash
    let index = url.indexOf("#");
    if (0 <= index) {
        temp = url.substring(0, index);
    }

    // make sure it's long enough to be a url
    if (9 < temp.length) {

        // remove protocol, hostname and port, make sure there's a pathname left
        temp = temp.substring(8);
        index = temp.indexOf("/");
        if ((0 <= index) && (index < temp.length - 2)) {
            temp = temp.substring(index + 1);

            // break into pieces and take last piece that looks like an image filename
            let fileNames = temp.split(/=|&|\:|\/|\?/).filter(s => that.isImageFileNameCandidate(s));
            if (0 < fileNames.length) {
                return fileNames[fileNames.length - 1];
            }
        }
    } 
    
    // if get here, nothing found
    return undefined;
}

// Crude. If string has '.' and is not a .php or .html, 
// and there's at least 3 characters after the '.'
// assume it's an image filename
ImageInfo.prototype.isImageFileNameCandidate = function(candidate) {
    let lowerString = candidate.toLowerCase();
    return (4 < lowerString.length) &&
        (lowerString.indexOf(".") !== -1) &&
        (lowerString.indexOf(".html") === -1) &&
        (lowerString.indexOf(".php") === -1) &&
        (4 <= (lowerString.length - lowerString.lastIndexOf(".")));
}

ImageInfo.prototype.getImageName = function (page) {
    let that = this;
    if(page){
        var name = that.extractImageFileNameFromUrl(page);
        if(name){
            return name.split(/\./gi)[0];
        }
    }
    // This is actually wise to do now.
    return undefined;
}

ImageInfo.prototype.createImageElement = function(includeImageSourceUrl) {
    let that = this;
    return util.createSvgImageElement(that.getZipHref(), that.width, that.height, 
        that.imagePageUrl, includeImageSourceUrl);
}

ImageInfo.prototype.chapterInfo = function*() {
    // images do not appear in table of contents
}

