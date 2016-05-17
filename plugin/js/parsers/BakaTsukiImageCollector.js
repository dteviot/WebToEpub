/*
    Fetches the image files
*/

"use strict";

/*
    Details of an image in BakaTsuki web page
    imagePageUrl :  URL of web page that holds list of versions of the image
    sourceImageUrl : URL of thumbnail image jpeg/png/bmp file in source web page
    zipHref:  relative path + filename used to store file in the EPUB (zip) file.
    id: the id value in the content.opf file
    mediaType: jpeg, png, etc.
    arrayBuffer: the image bytes
    isCover :  use this as the cover image?
    height: "full size" image height 
    width: "full size" image width
    imagefileUrl: URL of "full size" image file at Baka-Tsuki
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
    this.height = null;
    this.width = null;
    this.imagefileUrl = null
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
            return "image/png";
        case "JPG":
        case "JPEG":
            return "image/jpeg";
        case "GIF":
            return "image/gif";
        default:
            alert("Unknown media type:" + suffix);
            return "image/" + suffix;
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

BakaTsukiImageInfo.prototype.createImageElement = function() {
    let that = this;
    return util.createSvgImageElement(that.getZipHref(), that.width, that.height);
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
    // replace tag with nested <img> tag, with new <img> tag
    let imagePageUrl = BakaTsukiImageCollector.extractImagePageUrl(that.element);
    let imageInfo = images.get(imagePageUrl);
    if (imageInfo != null) {
        let newImage = imageInfo.createImageElement();
        that.element.parentElement.replaceChild(newImage, that.element);
    }
}

BakaTsukiImageCollector.makeImageConverter = function (element) {
    let that = this;
    if ((element.tagName === "DIV") &&
        ((element.className === "thumb tright") || (element.className === "floatright") ||
        (element.className === "thumb"))) {
        return new ImageElementConverter(element);
    } else {
        return null;
    }
}

BakaTsukiImageCollector.prototype.findImagesUsedInDocument = function (content) {
    let that = this;
    let images = new Map();
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

BakaTsukiImageCollector.prototype.populateImageTable = function (images, bakaTsukiParser) {
    let that = this;
    let imagesTable = document.getElementById("imagesTable");
    while (imagesTable.children.length > 1) {
        imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1])
    }
    images.forEach(function (imageInfo) {
        let row = document.createElement("tr");
        
        // add button
        let button = document.createElement("button");
        let key = imageInfo.imagePageUrl;
        button.textContent = "Set cover";
        button.onclick = function() { bakaTsukiParser.setCoverImage(key); };
        that.appendColumnToRow(row, button);

        // add image
        let img = document.createElement("img");
        img.setAttribute("style", "max-height: 120px; width: auto; ");
        img.src = imageInfo.sourceImageUrl;
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

BakaTsukiImageCollector.prototype.onLoadImagePage = function(imageList, client,  progressIndicator) {
    let that = this;
    if (0 < imageList.length) {
        let imageInfo = imageList[imageList.length - 1];
        client.fetchHtml(imageInfo.imagePageUrl, function (url, rawDom) {
            imageInfo = that.getImageFileDataFromImagePage(rawDom, imageInfo);
            that.onLoadImage(imageList, client,  progressIndicator, imageInfo.imagefileUrl);
        });
    } else {
        progressIndicator(true);
    }
}

BakaTsukiImageCollector.prototype.onLoadImage = function(imageList, client,  progressIndicator, imagefileUrl) {
    let that = this;
    client.fetchBinary(imagefileUrl, 
        (u, arraybuffer) => that.onImageData(imageList, client,  progressIndicator, arraybuffer)
    );
}

BakaTsukiImageCollector.prototype.getImageFileDataFromImagePage = function(dom, imageInfo) {
    let div = util.getElement(dom, "div", e => (e.className === "fullImageLink"));
    let img = util.getElement(dom, "img");
    imageInfo.imagefileUrl = img.src;
    imageInfo.height = img.height;
    imageInfo.width = img.width;
    return imageInfo;
}

BakaTsukiImageCollector.prototype.onImageData = function (imageList, client,  progressIndicator, arraybuffer) {
    let that = this;
    imageList.pop().arraybuffer = arraybuffer;
    progressIndicator(false);
    that.onLoadImagePage(imageList, client,  progressIndicator);
}

