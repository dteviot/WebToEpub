/*
    Fetches the image files
*/

"use strict";

/** class that handles image tags 
 * urlIndex - track URLs associated with an ImageInfo
 * bitmapIndex - hashes of the image bitmaps, to allow us to elminate duplicate images
 * imagesToFetch - images that need to be fetched from internet
 * imagesToPack - images to pack into epub
*/
class ImageCollector {
    constructor() {
        this.removeDuplicateImages = false;
        this.reset();
        this.includeImageSourceUrl = true;
        this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
    }

    // An "image collector" with no images
    // used by parsers for source with no images.
    static StubCollector() {
        return {
            coverImageInfo: null,
            imagesToPackInEpub: function() { return []; }
        }
    }

    reset() {
        this.imageInfoList = [];
        this.urlIndex = new Map();
        this.bitmapIndex = new Map();
        this.imagesToFetch = [];
        this.imagesToPack = [];
        this.coverImageInfo = null;
    }

    addImageInfo(wrappingUrl, sourceUrl, fetchFirst) {
        let that = this;
        let imageInfo = null;
        let index = this.urlIndex.get(sourceUrl);
        if (index !== undefined) {
             imageInfo = that.imageInfoList[index];
        } else {
            index = this.urlIndex.get(wrappingUrl);
            if (index !== undefined) {
                imageInfo = that.imageInfoList[index];
            };
        };
        if (imageInfo === null) {
            index = that.imageInfoList.length;
            imageInfo = new ImageInfo(wrappingUrl, index, sourceUrl);
            this.imageInfoList.push(imageInfo);
            if (!!fetchFirst) {
                that.imagesToFetch = [imageInfo].concat(that.imagesToFetch);
            } else {
                this.imagesToFetch.push(imageInfo);
            }
        };           
        this.urlIndex.set(wrappingUrl, index);
        this.urlIndex.set(sourceUrl, index);
        return imageInfo;
    }

    setCoverImageUrl(url) {
        // Note, this can be called in two cases.
        // 1. Baka-Tsuki, where images have already been loaded, so image may already be present
        // 2. Other Parsers, so image is not present.
        let that = this;
        if (url !== null) {
            let info = that.imageInfoByUrl(url);
            if (info === null) {
                info = that.addImageInfo(url, url, true);
            };
            info.isCover = true;
            that.coverImageInfo = info;
        };
    }

    imageInfoByUrl(url) {
        let index = this.urlIndex.get(url);
        return (index === undefined) ? null : this.imageInfoList[index];
    }

    onUserPreferencesUpdate(userPreferences) {
        this.removeDuplicateImages = userPreferences.removeDuplicateImages;
        this.includeImageSourceUrl = userPreferences.includeImageSourceUrl;
        if (userPreferences.higestResolutionImages) {
            this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
        } else {
            this.selectImageUrlFromImagePage = this.getReducedResImageUrlFromImagePage
        }
    }

    numberOfImagesToFetch() {
        return this.imagesToFetch.length;
    }

    fetchImages(progressIndicator) {
        let that = this;
        let temp = that.imagesToFetch.reduce(function(sequence, imageInfo) {
            return sequence.then(function() {
                return that.fetchImage(imageInfo, progressIndicator);
            })
        }, Promise.resolve());
        that.imagesToFetch = [];
        return temp;
    }

    /**
    * @private
    */
    addToPackList(imageInfo) {
        let that = this;
        let hash = ImageCollector.calculateHash(imageInfo.arraybuffer);
        let index = that.bitmapIndex.get(hash);
        if (index === undefined) {
            // first time we've seen the bitmap, so all OK
            that.bitmapIndex.set(hash, imageInfo.index);
            that.imagesToPack.push(imageInfo);
        } else {
            // duplicate bitmap, use previous version
            let wrongIndex = imageInfo.index;
            for(let [key, value] of that.urlIndex) {
                if (value === wrongIndex) {
                    that.urlIndex.set(key, index);
                };
            };
        };
    }

    /**
    * @private
    */
    static calculateHash(arraybuffer) {
        let hash = 0;
        let byteArray = new Uint8Array(arraybuffer);
        if (byteArray.length !== 0) {
            for(let i = 0; i < byteArray.length; ++i) {
                hash = ((hash << 5) - hash) + byteArray[i];
                hash |= 0;
            }
        }
        return ImageCollector.toHex(byteArray.length) + ImageCollector.toHex(hash);
    }

    
    /** Convert integer to 8 character Hex value
    * @private
    */
    static toHex(i) {
        let s = '00000000' + i.toString(16);
        return s.substring(s.length - 8);
    }
}

// get URL of page that holds all copies of this image
ImageCollector.prototype.extractWrappingUrl = function (element) {
    if (element.tagName.toLowerCase() === "img") {
        return element.src;
    }
    return (element.tagName.toLowerCase() === "a") ? element.href : element.getElementsByTagName("a")[0].href;
}

// get src value of <img> element
ImageCollector.prototype.extractImageSrc = function (element) {
    return (element.tagName.toLowerCase() === "img") ?  element.src : element.getElementsByTagName("img")[0].src;
}

ImageCollector.prototype.makeImageTagReplacer = function (element) {
    let that = this;
    let wrappingElement = that.findImageWrappingElement(element);
    let wrappingUrl = that.extractWrappingUrl(wrappingElement);
    return new ImageTagReplacer(wrappingElement, wrappingUrl, that.removeDuplicateImages, that.includeImageSourceUrl);
}

ImageCollector.prototype.findImageWrappingElement = function (element) {
    let that = this;

    // find "highest" element that is wrapping an image element
    let parent = element.parentElement;
    if ((parent === null) || (parent.tagName.toLowerCase() !== "a")) {
        // image not wrapped in hyperlink, so just return the image itself
        return element;
    }
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
    return ((element.tagName.toLowerCase() === "div") &&
        ((element.className === "thumb tright") || (element.className === "floatright") ||
        (element.className === "thumb") || (element.className === "floatleft")));
}

ImageCollector.prototype.findImagesUsedInDocument = function (content) {
    let that = this;
    for(let currentNode of util.getElements(content, "img")) {
        let src = currentNode.src;
        let wrappingElement = that.findImageWrappingElement(currentNode);
        let wrappingUrl = that.extractWrappingUrl(wrappingElement);
        let existing = that.imageInfoByUrl(wrappingUrl);
        if(existing == null){
            that.addImageInfo(wrappingUrl, src, false);
        } else {
            existing.isOutsideGallery = true;
        };
    };
}

/**  Update image tags, point to image file in epub
* @param {element} element containing <img> tags to update
*/
ImageCollector.prototype.replaceImageTags = function (element) {
    let that = this;
    let converters = [];
    for(let currentNode of util.getElements(element, "img")) {
        converters.push(that.makeImageTagReplacer(currentNode));
    };
    converters.forEach(c => c.replaceTag(that.imageInfoByUrl(c.wrappingUrl)));
}

ImageCollector.prototype.getImageUrlFromImagePage = function(dom, className) {
    let div = util.getElement(dom, "div", e => (e.className === className));
    if (div === null) {
        return null;
    } else {
        let link = util.getElement(div, "a");
        return (link === null) ? null : link.href;
    }
}

ImageCollector.prototype.getHighestResImageUrlFromImagePage = function(dom) {
    return this.getImageUrlFromImagePage(dom, "fullMedia");
}

ImageCollector.prototype.getReducedResImageUrlFromImagePage = function(dom) {
    return this.getImageUrlFromImagePage(dom, "fullImageLink");
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
        img.src = imageInfo.sourceUrl;
    });
}

ImageCollector.prototype.fetchImage = function(imageInfo, progressIndicator) {
    let that = this;
    let client = new HttpClient();
    return client.fetchHtml(imageInfo.wrappingUrl).then(function (xhr) {
        imageInfo.sourceUrl = that.findImageFileUrl(xhr, imageInfo);
        return that.getImageDimensions(imageInfo);
    }).then(function () {
        return client.fetchBinary(imageInfo.sourceUrl);
    }).then(function (xhr) {
        imageInfo.mediaType = xhr.getResponseHeader("Content-Type");
        imageInfo.arraybuffer = xhr.response;
        progressIndicator();
        that.addToPackList(imageInfo)
    }).catch(function(error) {
        // ToDo, implement error handler.
        that.imagesToPack.push(imageInfo);
        alert(error);
    });
}

ImageCollector.prototype.findImageFileUrl = function(xhr, imageInfo) {
    let that = this;
    let contentType = xhr.getResponseHeader("Content-Type");
    if (contentType.startsWith("text/html")) {
        // find URL of wanted image file on html page
        let temp = that.selectImageUrlFromImagePage(xhr.responseXML);
        return (temp == null) ? imageInfo.sourceUrl : temp;
    } else {
        // page wasn't HTML, so assume is actual image
        return imageInfo.wrappingUrl;
    }
}

ImageCollector.prototype.imagesToPackInEpub = function() {
    return this.imagesToPack;
}

//==============================================================

/** Class to replace an <img> tag. */
class ImageTagReplacer {
    /**
     * Record details of element to replace
     * @param {element} wrappingElement the outermost parent element of the <img> tag to remove.
     * @param {string} wrappingUrl url of image being replaced
     * @param {bool} removeDuplicateImages - Remove images from gallery that appear elsewhere?
     * @param {bool} includeImageSourceUrl - Include the image's orignal URL as a svc <desc>?
     */
    constructor(wrappingElement, wrappingUrl, removeDuplicateImages, includeImageSourceUrl) {
        this.wrappingElement = wrappingElement;
        this.wrappingUrl = wrappingUrl;
        this.removeDuplicateImages = removeDuplicateImages;
        this.includeImageSourceUrl = includeImageSourceUrl
    }

    /**
     * @param {imageInfo} imageInfo to use to construct replacement tag
     */
    replaceTag(imageInfo) {
        let that = this;
        // replace tag with nested <img> tag, with new <img> tag
        let parent = that.wrappingElement.parentElement;
        if ((imageInfo != null) && (parent != null)) {
            if (that.isDuplicateImageToRemove(imageInfo)) {
                util.removeNode(that.wrappingElement);
            } else {
                that.insertImageInLegalParent(parent, imageInfo);
            };
        };
    }

    /**
     * @private
     */
    insertImageInLegalParent(parent, imageInfo) {
        let that = this;
        // Under XHTML, <div> not allowed to be a child of a <p> element, (or <i>, <u>, <s> etc.)
        let nodeAfter = that.wrappingElement;
        while (util.isInlineElement(parent) && (parent.parentNode != null)) {
            nodeAfter = parent;
            parent = parent.parentNode;
        };
        if (parent.tagName.toLowerCase() === "p") {
            nodeAfter = parent;
        };
        let newImage = imageInfo.createImageElement(that.includeImageSourceUrl);
        nodeAfter.parentNode.insertBefore(newImage, nodeAfter);
        util.removeNode(that.wrappingElement);
    }

    /**
     * @private
     */
    isDuplicateImageToRemove(imageInfo) {
        let that = this;
        return that.removeDuplicateImages && that.isElementInImageGallery() && (imageInfo.isOutsideGallery || imageInfo.isCover);
    }

    /**
     * @private
     */
    isElementInImageGallery() {
        return (this.wrappingElement.className === "thumb");
    }
}
