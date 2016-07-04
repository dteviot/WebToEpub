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
function ImageInfo(imagePageUrl, imageIndex, sourceImageUrl) {
    // ToDo:  This will need to derive from EpubItem
    let that = this;
    this.imagePageUrl = imagePageUrl;
    this.sourceImageUrl = sourceImageUrl;
    let suffix = that.findImageType(imagePageUrl);
    this.zipHref = that.makeZipHref(imageIndex, suffix, imagePageUrl);
    this.id = that.makeId(imageIndex);
    this.imageIndex = imageIndex;
    this.isCover = false;
    this.isInSpine = false;
    this.isOutsideGallery = false;
    this.arraybuffer = null;
    this.height = null;
    this.width = null;
    this.imagefileUrl = null
}

ImageInfo.prototype.findImageType = function (imagePageUrl) {
    // assume the image Page URL looks something like this:
    // http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg
    let index = imagePageUrl.lastIndexOf(".");
    let suffix = imagePageUrl.substring(index + 1, imagePageUrl.length);
    return suffix;
}

ImageInfo.prototype.makeZipHref = function (imageIndex, suffix, imagePageUrl) {
    let that = this;
    return util.makeStorageFileName("OEBPS/Images/", imageIndex, that.getImageName(imagePageUrl), suffix);
}

// assume image URL is one one of the following
// https://www.baka-tsuki.org/project/index.php?title=File:HSDxD_v01_cover.jpg
// https://www.baka-tsuki.org/project/thumb.php?f=HSDxD_v01_cover.jpg&width=427
// https://www.baka-tsuki.org/project/images/7/76/HSDxD_v01_cover.jpg
ImageInfo.prototype.getImageName = function (page) {
    if(page){
        var name = page.split(/\//gi).length > 1 ? page.split(/file:/gi)[1] : page;
        if(name){
            return name.split(/\./gi)[0];
        }
    }
    // This is actually wise to do now.
    return undefined;
}

ImageInfo.prototype.makeId = function (imageIndex) {
    return "image" + util.zeroPad(imageIndex);
}

ImageInfo.prototype.getZipHref = function () {
    return this.zipHref;
}

ImageInfo.prototype.getId = function () {
    return this.id;
}

ImageInfo.prototype.getMediaType = function () {
    return this.mediaType;
}

ImageInfo.prototype.fileContentForEpub = function() {
    return this.arraybuffer;
}

ImageInfo.prototype.createImageElement = function() {
    let that = this;
    return util.createSvgImageElement(that.getZipHref(), that.width, that.height, that.imagePageUrl);
}

function ImageCollector() {
    this.removeDuplicateImages = false;
    this.images = new Map();
    this.removeDuplicateImages = false;
    this.coverImageInfo = null;
    this.coverUrlProvider = null;
}

// get URL of page that holds all copies of this image
ImageCollector.prototype.extractImagePageUrl = function (element) {
    return (element.tagName === "A") ? element.href : element.getElementsByTagName("a")[0].href;
}

// get src value of <img> element
ImageCollector.prototype.extractImageSrc = function (element) {
    return element.getElementsByTagName("img")[0].src;
}

function ImageElementConverter(element, imagePageUrl, removeDuplicateImages) {
    this.element = element;
    this.imagePageUrl = imagePageUrl;
    this.removeDuplicateImages = removeDuplicateImages;
}

ImageElementConverter.prototype.replaceWithImagePageUrl = function (images) {
    let that = this;
    // replace tag with nested <img> tag, with new <img> tag
    let imageInfo = images.get(that.imagePageUrl);
    if (imageInfo != null && that.element.parentElement != null) {
        let newImage = imageInfo.createImageElement();
        if (that.isDuplicateImageToRemove(imageInfo)) {
            util.removeNode(that.element)
        }else{
            that.element.parentElement.replaceChild(newImage, that.element);
        }
    }
}

ImageElementConverter.prototype.isDuplicateImageToRemove = function (imageInfo) {
    let that = this;
    return that.removeDuplicateImages && that.isElementInImageGallery() && (imageInfo.isOutsideGallery || imageInfo.isCover);
}

ImageElementConverter.prototype.isElementInImageGallery = function () {
    return (this.element.className === "thumb");
}

ImageCollector.prototype.makeImageConverter = function (element) {
    let that = this;
    let wrappingElement = that.findImageWrappingElement(element);
    let imagePageUrl = that.extractImagePageUrl(wrappingElement);
    return (imagePageUrl === null) ? null : new ImageElementConverter(wrappingElement, imagePageUrl, that.removeDuplicateImages);
}

ImageCollector.prototype.findImageWrappingElement = function (element) {
    let that = this;

    // find "highest" element that is wrapping an image element
    let parent = element.parentElement;
    while (parent != null) {
        if (that.isImageWrapperElement(parent)) {
            return parent;
        }
        parent = parent.parentElement;
    }

    // assume all images are wrapped in at least a href
    return element.parentElement;
}

ImageCollector.prototype.isImageWrapperElement = function (element) {
    return ((element.tagName === "DIV") &&
        ((element.className === "thumb tright") || (element.className === "floatright") ||
        (element.className === "thumb")));
}

ImageCollector.prototype.findImagesUsedInDocument = function (content) {
    let that = this;
    let images = new Map();
    that.images = images;
    for(let currentNode of util.getElements(content, "img")) {
        let converter = that.makeImageConverter(currentNode)
        if (converter != null) {
            let src = that.extractImageSrc(converter.element);
            let pageUrl = converter.imagePageUrl;
            let existing = images.get(pageUrl);
            if(existing == null){
                images.set(pageUrl, new ImageInfo(pageUrl, images.size, src));
            } else {
                existing.isOutsideGallery = true;
            }
        }
    };
    return images;
}

ImageCollector.prototype.processImages = function (element) {
    let that = this;
    let converters = [];
    for(let currentNode of util.getElements(element, "img")) {
        let converter = that.makeImageConverter(currentNode);
        if (converter != null) {
            converters.push(converter);
        }
    };
    converters.forEach(c => c.replaceWithImagePageUrl(that.images));
}

ImageCollector.prototype.getImageTableElement = function() {
    return document.getElementById("imagesTable");
}

ImageCollector.prototype.clearImageTable = function() {
    let that = this;
    let imagesTable = that.getImageTableElement();
    while (imagesTable.children.length > 0) {
        imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1])
    }
}

ImageCollector.prototype.populateImageTable = function() {
    let that = this;
    that.clearImageTable();
    let imagesTable = that.getImageTableElement();
    let checkBoxIndex = 0;
    if (0 === that.images.size) {
        imagesTable.parentElement.appendChild(document.createTextNode("No images found"));
    }
    else {
        that.images.forEach(function (imageInfo) {
            let row = document.createElement("tr");
        
            // add checkbox
            let checkbox = that.createCheckBoxAndLabel(imageInfo, checkBoxIndex);
            that.appendColumnToRow(row, checkbox);

            // add image
            let img = document.createElement("img");
            img.setAttribute("style", "max-height: 120px; width: auto; ");
            img.src = imageInfo.sourceImageUrl;
            that.appendColumnToRow(row, img);
            imagesTable.appendChild(row);

            ++checkBoxIndex;
        });
    }
}

ImageCollector.prototype.createCheckBoxAndLabel = function (imageInfo, checkBoxIndex) {
    let that = this;
    let label = document.createElement("label");
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "setCoverCheckBox" + checkBoxIndex;
    checkbox.onclick = function() { that.onImageClicked(checkbox.id, imageInfo, that); };
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode("Set Cover"));

    // default to first image as cover image
    if (checkBoxIndex === 0) {
        that.setCoverImage(imageInfo);
        checkbox.checked = true;
    }
    return label;
}

ImageCollector.prototype.onImageClicked = function(checkboxId, imageInfo, imageCollector) {
    let that = this;
    let checkbox = document.getElementById(checkboxId);
    if (checkbox.checked === true) {
        imageCollector.setCoverImage(imageInfo);

        // uncheck any other checked boxes
        let imagesTable = that.getImageTableElement();
        for(let box of util.getElements(imagesTable, "input")) {
            if (box.id !== checkboxId) {
                box.checked = false;
            }
        }
    } else {
        imageCollector.setCoverImage(null);
    }
} 

// when imageInfo === null, setting to "No cover image"
ImageCollector.prototype.setCoverImage = function (imageInfo) {
    let that = this;
    if (that.coverImageInfo !== null) {
        that.coverImageInfo.isCover = false;
    }
    if (imageInfo !== null) {
        // ToDo, should check that that.isGetCoverFromUrl() is false
        imageInfo.isCover = true;
    };
    that.coverImageInfo = imageInfo;
}

ImageCollector.prototype.appendColumnToRow = function (row, element) {
    let col = document.createElement("td");
    col.appendChild(element);
    col.style.whiteSpace = "nowrap";
    row.appendChild(col);
    return col;
}

ImageCollector.prototype.getHighestResImageUrlFromImagePage = function(dom) {
    let div = util.getElement(dom, "div", e => (e.className === "fullMedia"));
    return util.getElement(div, "a").href;
}

ImageCollector.prototype.getReducedResImageUrlFromImagePage = function(dom) {
    let div = util.getElement(dom, "div", e => (e.className === "fullImageLink"));
    return util.getElement(div, "img").src;
}

ImageCollector.prototype.getImageDimensions = function(imageInfo) {
    return new Promise(function(resolve, reject){
        let img = new Image();
        img.onload = function() {
            imageInfo.height = img.height;
            imageInfo.width = img.width;
            resolve();
        }
        img.onerror = function(){
            // If the image gives an error then set a general height and width
            imageInfo.height = 1200;
            imageInfo.width = 1600;
            resolve();
        }
        // start downloading image after event handlers are set
        img.src = imageInfo.imagefileUrl;
    });
}

ImageCollector.prototype.onCoverFromUrlClick = function(enable) {
    let that = this;
    if (enable) {
        that.setCoverImage(null);
        that.clearImageTable();
        that.addCoverFromUrlInputRow();
        that.coverUrlProvider = function () { 
            return document.getElementById("coverImageUrlInput").value 
        };
    } else {
        that.coverUrlProvider = null;
        that.populateImageTable();
    }
}

ImageCollector.prototype.addCoverFromUrlInputRow = function(urlProvider) {
    let that = this;
    let row = document.createElement("tr");
    that.getImageTableElement().appendChild(row);
    that.appendColumnToRow(row, document.createTextNode("Cover Image URL:"));

    let inputUrl = document.createElement("input");
    inputUrl.type = "text";
    inputUrl.id = "coverImageUrlInput";
    inputUrl.size = 60;
    that.appendColumnToRow(row, inputUrl);
}

ImageCollector.prototype.isGetCoverFromUrl = function() {
    return this.coverUrlProvider !== null;
}

ImageCollector.prototype.numberOfImagesToFetch = function() {
    return this.images.size + (this.isGetCoverFromUrl() ? 1 : 0);
}

ImageCollector.prototype.fetchImages = function (progressIndicator) {
    let that = this;
    let imagesToFetch = [];
    that.images.forEach(image => imagesToFetch.push(image));
    that.addCoverFromUrlToList(imagesToFetch);
    return imagesToFetch.reduce(function(sequence, mapElement) {
        return sequence.then(function() {
            return that.fetchImage(mapElement, progressIndicator);
        })
    }, Promise.resolve());
}

ImageCollector.prototype.addCoverFromUrlToList = function(imageListCopy) {
    let that = this;
    if (that.isGetCoverFromUrl()) {
        let url = that.coverUrlProvider();
        that.coverImageInfo = new ImageInfo(url, this.images.size, url);
        that.coverImageInfo.isCover = true;
        imageListCopy.push(that.coverImageInfo);
    };
}

ImageCollector.prototype.fetchImage = function(imageInfo, progressIndicator) {
    let that = this;
    let client = new HttpClient();
    return client.fetchHtml(imageInfo.imagePageUrl).then(function (xhr) {
        imageInfo.imagefileUrl = that.findImageFileUrl(xhr, imageInfo);
        return that.getImageDimensions(imageInfo);
    }).then(function () {
        return client.fetchBinary(imageInfo.imagefileUrl);
    }).then(function (xhr) {
        imageInfo.mediaType = xhr.getResponseHeader("Content-Type");
        imageInfo.arraybuffer = xhr.response;
        progressIndicator();
    }).catch(function(error) {
        // ToDo, implement error handler.
        alert(error);
    });
}

ImageCollector.prototype.findImageFileUrl = function(xhr, imageInfo) {
    let that = this;
    let contentType = xhr.getResponseHeader("Content-Type");
    if (contentType.startsWith("text/html")) {
        // find URL of wanted image file on html page
        return that.getHighestResImageUrlFromImagePage(xhr.responseXML);
    } else {
        // page wasn't HTML, so assume is actual image
        return imageInfo.imagePageUrl;
    }
}

ImageCollector.prototype.imagesToPackInEpub = function() {
    let that = this;
    let imageListCopy = [];
    that.images.forEach(image => imageListCopy.push(image));
    if (that.isGetCoverFromUrl()) {
        imageListCopy.push(that.coverImageInfo);
    }
    return imageListCopy;
}
