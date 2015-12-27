/*
    Fetches the image files
*/

"use strict";

/*
    Details of an image in BakaTsuki web page
    imagePageUrl :  URL of web page that holds list of versions of the image
    sourceImageUrl : URL of actual jpeg/png/bmp file that will be used for the image
    zipHref:  relative path + filename used to store file in the EPUB (zip) file.
    id: the id value in the content.opf file
    mediaType: jpeg, png, etc.
    arrayBuffer: the image bytes
    isCover :  use this as the cover image?
*/
function BakaTsukiImageInfo(imagePageUrl, imageIndex, sourceImageUrl) {
    // ToDo:  This will need to derive from EpubItem
    let that = this;
    this.imagePageUrl = imagePageUrl;
    this.sourceImageUrl = sourceImageUrl;
    let suffix = that.findImageType(imagePageUrl);
    this.zipHref = that.makeZipHref(imageIndex, suffix);
    this.id = that.makeId(imageIndex);
    this.mediaType = that.makeMediaType(suffix);
    this.imageIndex = imageIndex;
    this.isCover = false;
    this.isInSpine = false;
    this.arraybuffer = null;
}

BakaTsukiImageInfo.prototype.findImageType = function (imagePageUrl) {
    // assume the image Page URL looks something like this:
    // http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg
    let index = imagePageUrl.lastIndexOf(".");
    let suffix = imagePageUrl.substring(index + 1, imagePageUrl.length);
    return suffix;
}

BakaTsukiImageInfo.prototype.makeZipHref = function (imageIndex, suffix) {
    return "images/image_" + util.zeroPad(imageIndex) + "." +suffix;
}

BakaTsukiImageInfo.prototype.makeId = function (imageIndex) {
    return "image" + util.zeroPad(imageIndex);
}

BakaTsukiImageInfo.prototype.makeMediaType = function (suffix) {
    switch(suffix.toUpperCase()) {
        case "PNG":
            return "image/png"
        case "JPG":
        case "JPEG":
            return "image/jpeg"
        case "GIF":
            return "image/gif"
        default:
            console.error("Unknown media type:" + suffix);
    };
}

BakaTsukiImageInfo.prototype.getZipHref = function () {
    return this.zipHref;
}

BakaTsukiImageInfo.prototype.getId = function () {
    return this.id;
}

BakaTsukiImageInfo.prototype.getMediaType = function () {
    return this.mediaType;
}

BakaTsukiImageInfo.prototype.fileContentForEpub = function() {
    return this.arraybuffer;
}

function BakaTsukiImageCollector() {
}

// get URL of page that holds all copies of this image
BakaTsukiImageCollector.extractImagePageUrl = function (element) {
    return element.getElementsByTagName("a")[0].href;
}

// get src value of <img> element
BakaTsukiImageCollector.extractImageSrc = function (element) {
    return element.getElementsByTagName("img")[0].src;
}

function ImageElementConverter(element) {
    this.element = element;
}

ImageElementConverter.prototype.replaceWithImagePageUrl = function (images) {
    let that = this;
    // replace nested tag with <img> tag holding web page with list of images
    let imagePageUrl = BakaTsukiImageCollector.extractImagePageUrl(that.element);
    let imageInfo = images.get(imagePageUrl);
    if (imageInfo != null) {
        let newImage = that.element.ownerDocument.createElement("img");
        let oldImage = that.element.getElementsByTagName("img")[0];
        oldImage.parentElement.replaceChild(newImage, oldImage);
        newImage.setAttribute("src", imageInfo.getZipHref());
    }
}

BakaTsukiImageCollector.makeImageConverter = function (element) {
    let that = this;
    if ((element.tagName === "LI") && (element.className === "gallerybox")) {
        return new ImageElementConverter(element);
    } else if ((element.tagName === "DIV") &&
        ((element.className === "thumb tright") || (element.className === "floatright"))) {
        return new ImageElementConverter(element);
    } else {
        return null;
    }
}

BakaTsukiImageCollector.prototype.getImages = function (content, imageMap) {
    let that = this;
    let images = imageMap || new Map();
    let walker = document.createTreeWalker(content);
    do {
        let currentNode = walker.currentNode;
        let converter = BakaTsukiImageCollector.makeImageConverter(currentNode)
        if (converter != null) {
            let src = BakaTsukiImageCollector.extractImageSrc(currentNode);
            let pageUrl = BakaTsukiImageCollector.extractImagePageUrl(currentNode);
            let existing = images.get(pageUrl);
            let index = (existing == null) ? images.size : existing.imageIndex;
            let imageInfo = new BakaTsukiImageInfo(pageUrl, index, src);
            images.set(pageUrl, imageInfo);
        }
    } while (walker.nextNode());
    return images;
}

BakaTsukiImageCollector.prototype.populateImageTable = function (images) {
    let that = this;
    let imagesTable = document.getElementById("imagesTable");
    while (imagesTable.children.length > 1) {
        imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1])
    }
    images.forEach(function (imageInfo) {
        let row = document.createElement("tr");
        let img = document.createElement("img");
        img.setAttribute("style", "max-height: 120px; width: auto; ");
        that.fetchImageData(img, imageInfo);
            // img.src = image;
        that.appendColumnToRow(row, img);
        imagesTable.appendChild(row);
    });

}

BakaTsukiImageCollector.prototype.appendColumnToRow = function (row, element) {
    let col = document.createElement("td");
    col.appendChild(element);
    col.style.whiteSpace = "nowrap";
    row.appendChild(col);
    return col;
}

BakaTsukiImageCollector.prototype.fetchImageData = function (img, imageInfo) {
    let that = this;
    let request = new HttpClient();
    request.fetchBinary(imageInfo.sourceImageUrl, (u, arraybuffer) => that.onImageData(img, imageInfo, arraybuffer));
}

BakaTsukiImageCollector.prototype.onImageData = function (img, imageInfo, arraybuffer) {
    imageInfo.arraybuffer = arraybuffer;
    let blob = new Blob([arraybuffer]);
    img.src = URL.createObjectURL(blob);
}
