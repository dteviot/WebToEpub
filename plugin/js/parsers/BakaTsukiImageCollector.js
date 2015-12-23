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

// get src value of <img> element
BakaTsukiImageCollector.extractImageSrc = function (element) {
    return element.getElementsByTagName("img")[0].src;
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

BakaTsukiImageCollector.prototype.getImages = function (content) {
    let that = this;
    let images = new Map();
    let walker = document.createTreeWalker(content);
    while (walker.nextNode()) {
        let currentNode = walker.currentNode;
        let converter = BakaTsukiImageCollector.makeImageConverter(currentNode)
        if (converter != null) {
            let src = BakaTsukiImageCollector.extractImageSrc(currentNode);
            let pageUrl = BakaTsukiImageCollector.extractImagePageUrl(currentNode);
            images.set(pageUrl, src);
        }
    }
    return images;
}

BakaTsukiImageCollector.prototype.populateImageTable = function (images) {
    let that = this;
    let imagesTable = document.getElementById("imagesTable");
    while (imagesTable.children.length > 1) {
        imagesTable.removeChild(linksTable.children[imagesTable.children.length - 1])
    }
    images.forEach(function (image) {
        let row = document.createElement("tr");
        let img = document.createElement("img");
        that.fetchImageData(img, image);
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

BakaTsukiImageCollector.prototype.fetchImageData = function (img, url) {
    let that = this;
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url);
    oReq.responseType = "blob";
    oReq.onload = oEvent => that.onImageLoaded(img, oReq.response);
    oReq.send(null);
}

BakaTsukiImageCollector.prototype.onImageLoaded = function (img, blob) {
    img.src = URL.createObjectURL(blob);
}

