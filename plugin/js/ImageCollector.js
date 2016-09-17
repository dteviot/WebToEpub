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
            if (fetchFirst) {
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
        if (!util.isNullOrEmpty(url)) {
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
        let s = "00000000" + i.toString(16);
        return s.substring(s.length - 8);
    }

    /*
    *  Hook point for Baka-Tsuki to select image to fetch
    */
    selectImageUrlFromHtmlImagesPage(html) {  // eslint-disable-line no-unused-vars
        return null;
    }


    // get URL of page that holds all copies of this image
    extractWrappingUrl(element) {
        if (element.tagName.toLowerCase() === "img") {
            return element.src;
        }
        return (element.tagName.toLowerCase() === "a") ? element.href : element.getElementsByTagName("a")[0].href;
    }

    // get src value of <img> element
    extractImageSrc(element) {
        return (element.tagName.toLowerCase() === "img") ?  element.src : element.getElementsByTagName("img")[0].src;
    }

    makeImageTagReplacer(element) {
        let that = this;
        let wrappingElement = that.findImageWrappingElement(element);
        let wrappingUrl = that.extractWrappingUrl(wrappingElement);
        return new ImageTagReplacer(wrappingElement, wrappingUrl, that.removeDuplicateImages, that.includeImageSourceUrl);
    }

    findImageWrappingElement(element) {
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

    isImageWrapperElement(element) {
        return ((element.tagName.toLowerCase() === "div") &&
            ((element.className === "thumb tright") || (element.className === "floatright") ||
            (element.className === "thumb") || (element.className === "floatleft")));
    }

    findImagesUsedInDocument(content) {
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
    replaceImageTags(element) {
        let that = this;
        let converters = [];
        for(let currentNode of util.getElements(element, "img")) {
            converters.push(that.makeImageTagReplacer(currentNode));
        };
        converters.forEach(c => c.replaceTag(that.imageInfoByUrl(c.wrappingUrl)));
    }

    getImageDimensions(imageInfo) {
        return new Promise(function(resolve, reject){ // eslint-disable-line no-unused-vars
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

    fetchImage(imageInfo, progressIndicator) {
        let that = this;
        return HttpClient.wrapFetch(that.initialUrlToTry(imageInfo)).then(function (xhr) {
            return that.findImageFileUrl(xhr, imageInfo);
        }).then(function (xhr) {
            imageInfo.mediaType = xhr.contentType;
            imageInfo.arraybuffer = xhr.arrayBuffer;
            return that.getImageDimensions(imageInfo);
        }).then(function () {
            progressIndicator();
            that.addToPackList(imageInfo)
        }).catch(function(error) {
            // ToDo, implement error handler.
            that.imagesToPack.push(imageInfo);
            util.logError(error);
        });
    }

    findImageFileUrl(xhr, imageInfo) {
        let that = this;
        // with Baka-Tsuki, the link wrapping the image will return an HTML
        // page with a set of images.  We need to pick the desired image
        if (xhr.isHtml()) {
            // find URL of wanted image file on html page
            // if we can't find one, just use the original image.
            let temp = that.selectImageUrlFromImagePage(xhr.responseXML);
            if (temp != null) {
                imageInfo.sourceUrl = temp;
            }
            return HttpClient.wrapFetch(imageInfo.sourceUrl);
        } else {
            // page wasn't HTML, so assume is actual image
            imageInfo.sourceUrl = xhr.response.url;
            return Promise.resolve(xhr);
        }
    }

    imagesToPackInEpub() {
        return this.imagesToPack;
    }

    /*
    *  Hook point to allow picking between high and low res images.
    */
    initialUrlToTry(imageInfo) {
        return imageInfo.wrappingUrl;
    }
}

//==============================================================

class VariableSizeImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    onUserPreferencesUpdate(userPreferences) {
        super.onUserPreferencesUpdate(userPreferences);
        if (userPreferences.higestResolutionImages) {
            this.initialUrlToTry = (imageInfo) => imageInfo.wrappingUrl;
        } else {
            this.initialUrlToTry = (imageInfo) => imageInfo.sourceUrl;
        };
    }
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
