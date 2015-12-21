/*
    Fetches the image files
*/

"use strict";

function BakaTsukiImageCollector() {
}

// get URL of page that holds all copies of this image
BakaTsukiImageCollector.extractImagePageUrl = function (element) {
    return element.getElementsByTagName("a")[0].href;
}

function ImageElementConverter(element) {
    this.element = element;
}

ImageElementConverter.prototype.replaceWithImagePageUrl = function () {
    let that = this;
    // replace nested tag with <img> tag holding web page with list of images
    let img = that.element.ownerDocument.createElement("img");
    img.src = BakaTsukiImageCollector.extractImagePageUrl(that.element);
    that.element.parentElement.replaceChild(img, that.element);
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

