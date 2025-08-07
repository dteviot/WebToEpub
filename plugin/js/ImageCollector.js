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
        this.reset();
        this.userPreferences = null;
    }

    // An "image collector" with no images
    // used by parsers for source with no images.
    static StubCollector() {
        return {
            coverImageInfo: null,
            imagesToPackInEpub: function() { return []; }
        };
    }

    reset() {
        this.imageInfoList = [];
        this.urlIndex = new Map();
        this.bitmapIndex = new Map();
        this.imagesToFetch = [];
        this.imagesToPack = [];
        this.coverImageInfo = null;
    }

    copyState(otherImageCollector) {
        this.imageInfoList = otherImageCollector.imageInfoList;
        this.urlIndex = otherImageCollector.urlIndex;
        this.bitmapIndex = otherImageCollector.bitmapIndex;
        this.imagesToFetch = otherImageCollector.imagesToFetch;
        this.imagesToPack = otherImageCollector.imagesToPack;
        this.coverImageInfo = otherImageCollector.coverImageInfo;
        this.userPreferences = otherImageCollector.userPreferences;
    }

    addImageInfo(wrappingUrl, sourceUrl, dataOrigFileUrl, fetchFirst) {
        let imageInfo = null;
        let index = this.urlIndex.get(sourceUrl);
        if (index === undefined) {
            index = this.urlIndex.get(wrappingUrl);
        }
        if (index === undefined) {
            index = this.urlIndex.get(dataOrigFileUrl);
        }
        if (index !== undefined) {
            imageInfo = this.imageInfoList[index];
        } else {
            index = this.imageInfoList.length;
            imageInfo = new ImageInfo(wrappingUrl, index, sourceUrl, dataOrigFileUrl);
            this.imageInfoList.push(imageInfo);
            if (fetchFirst) {
                this.imagesToFetch = [imageInfo].concat(this.imagesToFetch);
            } else {
                this.imagesToFetch.push(imageInfo);
            }
        }           
        this.urlIndex.set(wrappingUrl, index);
        this.urlIndex.set(sourceUrl, index);
        if (dataOrigFileUrl != null) {
            this.urlIndex.set(dataOrigFileUrl, index);
        }
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
                info = that.addImageInfo(url, url, null, true);
            }
            info.isCover = true;
            that.coverImageInfo = info;
        }
    }

    imageInfoByUrl(url) {
        let index = this.urlIndex.get(url);
        return (index === undefined) ? null : this.imageInfoList[index];
    }

    onUserPreferencesUpdate(userPreferences) {
        this.userPreferences = userPreferences;
    }

    numberOfImagesToFetch() {
        return this.imagesToFetch.length;
    }

    async fetchImages(progressIndicator, parentPageUrl) {
        for (let imageInfo of this.imagesToFetch) {
            if (!imageInfo.queuedForFetch) {
                imageInfo.queuedForFetch = true;
                await this.fetchImage(imageInfo, progressIndicator, parentPageUrl);
            }
        }
        this.imagesToFetch = [];
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
            for (let [key, value] of that.urlIndex) {
                if (value === wrongIndex) {
                    that.urlIndex.set(key, index);
                }
            }
        }
    }

    /**
    * @private
    */
    static calculateHash(arraybuffer) {
        let hash = 0;
        let byteArray = new Uint8Array(arraybuffer);
        if (byteArray.length !== 0) {
            for (let i = 0; i < byteArray.length; ++i) {
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

    makeImageTagReplacer(element) {
        let that = this;
        let wrappingElement = that.findImageWrappingElement(element);
        let wrappingUrl = that.extractWrappingUrl(wrappingElement);
        return new ImageTagReplacer(wrappingElement, wrappingUrl, that.userPreferences);
    }

    findImageWrappingElement(element) {
        let that = this;

        // find "highest" element that is wrapping an image element
        let link = this.findWrappingLink(element);
        if (link === null) {
            // image not wrapped in hyperlink, so just return the image itself
            return element;
        }
        let parent = link;
        while (parent != null) {
            if (that.isImageWrapperElement(parent)) {
                return parent;
            }
            parent = parent.parentElement;
        }

        // assume all images are wrapped in at least a href
        return link;
    }

    findWrappingLink(element) {
        let link = element.parentElement;
        while (link !== null) {
            if (link.tagName.toLowerCase() === "a") {
                return link;
            }
            link = link.parentElement;
        }
        return link;
    }

    isImageWrapperElement(element) {
        return ((element.tagName.toLowerCase() === "div") &&
            ((element.className === "thumb tright") || (element.className === "floatright") ||
            (element.className === "thumb") || (element.className === "floatleft")));
    }

    findImagesUsedInDocument(content) {
        for (let imageElement of content.querySelectorAll("img")) {
            this.fixLazyLoadImageSource(imageElement);
            let src = this.findHighestResImage(imageElement);
            let wrappingElement = this.findImageWrappingElement(imageElement);
            let wrappingUrl = this.extractWrappingUrl(wrappingElement);
            let existing = this.imageInfoByUrl(wrappingUrl);
            if (existing == null) {
                let dataOrigFileUrl = this.findDataOrigFileUrl(imageElement, wrappingUrl);
                this.addImageInfo(wrappingUrl, src, dataOrigFileUrl, false);
            } else {
                existing.isOutsideGallery = true;
            }
        }
    }

    findHighestResImage(img) {
        let srcset = img.getAttribute("srcset");
        if (srcset != null) {
            let src = this.findHighestResInSrcset(srcset);
            if (src != null) {
                img.src = this.findHighestResInSrcset(srcset);
            }
        }
        return img.src;
    }

    findHighestResInSrcset(srcset) {
        let max = -1;
        let url = null;
        let pairs = srcset.split(",")
            .map(o => o.trim().split(" "))
            .filter(o => (o.length == 2) && o[0].startsWith("http"));
        for (let pair of pairs) {
            let size = parseInt(pair[1]);
            if (max < size) {
                max = size;
                url = pair[0];
            }
        }
        return url;
    }

    fixLazyLoadImageSource(img) {
        for (let attrib of ["data-lazy-srcset", "data-srcset"]) {
            let lazySrcset = img.getAttribute(attrib);
            if (lazySrcset != null) {
                img.setAttribute("srcset", lazySrcset);
                break;
            }
        }

        for (let attrib of ["data-lazy-src", "data-src"]) {
            let lazySrc = img.getAttribute(attrib);
            if (lazySrc != null) {
                img.src = lazySrc;
                break;
            }
        }
        return img.src;
    }

    findDataOrigFileUrl(imageElement, wrappingUrl) {
        let dataOrigFile = imageElement.getAttribute("data-orig-file");
        if ((dataOrigFile != null) && (dataOrigFile != imageElement.src)
            && (dataOrigFile != wrappingUrl)) {
            let baseUrl = imageElement.ownerDocument.baseURI;
            return util.resolveRelativeUrl(baseUrl, dataOrigFile);
        }
        return null;
    }
    
    /**  Update image tags, point to image file in epub
    * @param {element} element containing <img> tags to update
    */
    replaceImageTags(element) {
        let that = this;
        let converters = [];
        for (let currentNode of element.querySelectorAll("img")) {
            converters.push(that.makeImageTagReplacer(currentNode));
        }
        converters.forEach(c => c.replaceTag(that.imageInfoByUrl(c.wrappingUrl)));
    }

    getImageDimensions(imageInfo) {
        return new Promise(function(resolve, reject) { // eslint-disable-line no-unused-vars
            let img = new Image();
            let options = {type: imageInfo.mediaType};
            let blob = new Blob([new Uint8Array(imageInfo.arraybuffer)], options);
            let dataUrl = URL.createObjectURL(blob);
            img.onload = function() {
                imageInfo.height = img.height;
                imageInfo.width = img.width;
                URL.revokeObjectURL(dataUrl);
                resolve(img);
            };
            img.onerror = function() {
                // If the image gives an error then set a general height and width
                imageInfo.height = 1200;
                imageInfo.width = 1600;
                URL.revokeObjectURL(dataUrl);
                reject(img);
            };
            // start downloading image after event handlers are set
            img.src = dataUrl;
        });
    }

    runCompression(imageInfo, img) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (that.userPreferences.compressImages.value) 
            {
                let c = document.createElement("canvas");
                let ctx = c.getContext("2d");
                let maxResolution = that.userPreferences.compressImagesMaxResolution.value;            
                if (imageInfo.height > maxResolution || imageInfo.width > maxResolution)
                {
                    if (imageInfo.height > imageInfo.width)
                    {
                        c.height = maxResolution;
                        c.width = Math.max(1, Math.round((imageInfo.width * 1.0) / ((imageInfo.height * 1.0)/maxResolution)));
                    }
                    else
                    {
                        c.width = maxResolution;
                        c.height = Math.max(1, Math.round((imageInfo.height * 1.0) / ((imageInfo.width * 1.0)/maxResolution)));
                    }
                }
                else
                {
                    c.height = imageInfo.height;
                    c.width = imageInfo.width;
                }
                ctx.drawImage(img, 0, 0, c.width, c.height);
                c.toBlob(async (cBlob) => {
                    try {
                        imageInfo.height = c.height;
                        imageInfo.width = c.width;
                        imageInfo.mediaType = "image/jpeg";
                        imageInfo.arraybuffer = await cBlob.arrayBuffer();
                        resolve();
                    } catch (e) {
                        reject();
                    }
                }, "image/jpeg", 0.9);
            }
            else
            {
                resolve();
            }
        });
    }

    async fetchImage(imageInfo, progressIndicator, parentPageUrl) {
        try
        {
            let initialUrl = this.initialUrlToTry(imageInfo);
            this.urlIndex.set(initialUrl, imageInfo.index);
            let fetchOptions = {errorHandler: new FetchImageErrorHandler(parentPageUrl) };
            let xhr = await HttpClient.wrapFetch(initialUrl, fetchOptions);
            xhr = await this.findImageFileUrl(xhr, imageInfo, imageInfo.dataOrigFileUrl, fetchOptions);
            imageInfo.mediaType = xhr.contentType;
            imageInfo.arraybuffer = xhr.arrayBuffer;
            this.fixupInvalidMediaType(imageInfo);
            {
                let img = await this.getImageDimensions(imageInfo);
                await this.runCompression(imageInfo, img);
            }
            progressIndicator();
            this.addToPackList(imageInfo);
        }
        catch (error)
        {
            // ToDo, implement error handler.
            this.imagesToPack.push(imageInfo);
            ErrorLog.log(error);
        }
    }

    fixupInvalidMediaType(imageInfo) {
        if (!imageInfo.mediaType?.startsWith("image")) {
            imageInfo.mediaType = util.detectMimeType(imageInfo.getBase64(25));
            if (imageInfo.mediaType == null)
            {
                let path = new URL(imageInfo.sourceUrl).pathname;
                let index = path.lastIndexOf(".");
                let format = (index < 0)
                    ? "jpeg"
                    : path.substring(index + 1);
                imageInfo.mediaType = "image/" + format;
            }
        }
    }

    findImageFileUrl(xhr, imageInfo, dataOrigFileUrl, fetchOptions) {
        // with Baka-Tsuki, the link wrapping the image will return an HTML
        // page with a set of images.  We need to pick the desired image
        if (xhr.isHtml()) {
            // find URL of wanted image file on html page
            // if we can't find one, just use the original image.
            let temp = this.selectImageUrlFromImagePage(xhr.responseXML);
            if (temp == null) {
                if (dataOrigFileUrl != null) {
                    return this.findImageFileUrlUsingDataOrigFileUrl(imageInfo);
                }
                let baseUri = xhr.responseXML.baseURI;
                let errorMsg = chrome.i18n.getMessage("gotHtmlExpectedImageWarning", [baseUri]);
                ErrorLog.log(errorMsg);
                temp = imageInfo.sourceUrl;
            }
            temp = ImageCollector.removeSizeParamsFromWordPressQuery(temp);
            this.urlIndex.set(temp, imageInfo.index);
            return HttpClient.wrapFetch(temp, fetchOptions);
        } else {
            // page wasn't HTML, so assume is actual image
            imageInfo.sourceUrl = xhr.response.url;
            this.urlIndex.set(xhr.response.url, imageInfo.index);
            return Promise.resolve(xhr);
        }
    }

    findImageFileUrlUsingDataOrigFileUrl(imageInfo) {
        return HttpClient.wrapFetch(imageInfo.dataOrigFileUrl).then(
            xhr => this.findImageFileUrl(xhr, imageInfo, null)
        );
    }
    
    imagesToPackInEpub() {
        return this.imagesToPack;
    }

    /*
    *  Hook point to allow picking between high and low res images.
    */
    initialUrlToTry(imageInfo) {
        let urlToTry = imageInfo.sourceUrl;
        if (!util.isNullOrEmpty(imageInfo.wrappingUrl) 
            && !ImageCollector.urlHasFragment(imageInfo.wrappingUrl)) {
            urlToTry = imageInfo.wrappingUrl;
        }
        return ImageCollector.removeSizeParamsFromWordPressQuery(urlToTry);
    }

    static urlHasFragment(url) {
        try {
            return !util.isNullOrEmpty(new URL(url).hash);
        } catch (error) {
            return false;
        }
    }
    
    static removeSizeParamsFromWordPressQuery(originalUrl) {
        let url = new URL(originalUrl);
        let searchParams = url.searchParams;
        if (!util.isNullOrEmpty(searchParams.toString()) && 
            ImageCollector.isWordPressHostedFile(url.hostname) ) {
            ImageCollector.removeSizeParamsFromSearch(searchParams);
            return url.toString();
        } else {
            return originalUrl;
        }
    }

    static isWordPressHostedFile(hostname) {
        return hostname.endsWith("files.wordpress.com") || hostname.endsWith(".wp.com");
    }

    static removeSizeParamsFromSearch(searchParams) {
        searchParams.delete("w");
        searchParams.delete("h");
        searchParams.delete("resize");
    }

    /**
    *  Derived classess will override
    *  Base version tells user there's a problem
    */
    selectImageUrlFromImagePage(dom) {
        // try mediawkiki format
        let div = dom.querySelector("div.fullMedia");
        if (div !== null) {
            let link = div.querySelector("a");
            return (link === null) ? null : link.href;
        }
        return null;
    }

    preprocessImageTags(content, parentPageUrl) {
        if (this.userPreferences.skipImages.value) {
            util.removeChildElementsMatchingSelector(content, "img, image");
            return Promise.resolve(content);
        } else {
            return ImageCollector.replaceHyperlinksToImagesWithImages(content, parentPageUrl);
        }
    }

    static replaceHyperlinksToImagesWithImages(content, parentPageUrl) {
        let toReplace = util.getElements(content, "a", ImageCollector.isHyperlinkToImage);
        for (let hyperlink of toReplace.filter(h => !ImageCollector.linkContainsImageTag(h))) {
            ImageCollector.replaceHyperlinkWithImg(hyperlink);
        }
        return Imgur.expandGalleries(content, parentPageUrl);
    }

    /** @private */
    static isHyperlinkToImage(hyperlink) {
        let extension = ImageCollector.getExtensionFromUrlFilename(hyperlink);
        return extension === "png" ||
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "gif" ||
        extension === "svg";
    }

    /** @private */
    static getExtensionFromUrlFilename(hyperlink) {
        let split = util.extractFilename(hyperlink).split(".");
        return (split.length < 2) ? "" : split[split.length - 1];
    }

    /** @private */
    static linkContainsImageTag(hyperlink) {
        return (hyperlink.querySelector("img") !== null);
    }

    /** @private */
    static replaceHyperlinkWithImg(hyperlink) {
        let img = hyperlink.ownerDocument.createElement("img");
        img.src = hyperlink.href;
        hyperlink.replaceWith(img);
    }
}

//==============================================================

class VariableSizeImageCollector extends ImageCollector { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    onUserPreferencesUpdate(userPreferences) {
        super.onUserPreferencesUpdate(userPreferences);
        if (userPreferences.higestResolutionImages.value) {
            this.initialUrlToTry = (imageInfo) => imageInfo.wrappingUrl;
        } else {
            this.initialUrlToTry = (imageInfo) => imageInfo.sourceUrl;
        }
    }
}

//==============================================================

/** Class to replace an <img> tag. */
class ImageTagReplacer {
    /**
     * Record details of element to replace
     * @param {element} wrappingElement the outermost parent element of the <img> tag to remove.
     * @param {string} wrappingUrl url of image being replaced
     * @param {userPreferences} userPreferences - user's configuration options
     */
    constructor(wrappingElement, wrappingUrl, userPreferences) {
        this.wrappingElement = wrappingElement;
        this.wrappingUrl = wrappingUrl;
        this.userPreferences = userPreferences;
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
                that.wrappingElement.remove();
            } else {
                that.insertImageInLegalParent(parent, imageInfo);
            }
        }
    }

    /** @private */
    insertImageInLegalParent(parent, imageInfo) {
        if (this.isImageInline(imageInfo)) {
            this.insertInlineImageInLegalParent(imageInfo);
        } else {
            this.insertBlockImageInLegalParent(parent, imageInfo);
        }
    }

    /** @private */
    isImageInline(imageInfo) {
        const MAX_INLINE_IMAGE_HEIGHT = 200;
        let parent = this.wrappingElement;
        while ((parent != null) && util.isInlineElement(parent)) {
            parent = parent.parentNode;
        }
        return this.isParagraph(parent) &&
            !util.isNullOrEmpty(parent.textContent) &&
            (imageInfo.height <= MAX_INLINE_IMAGE_HEIGHT);
    }

    /** @private */
    isParagraph(element) {
        return (element != null) && (element.tagName.toLowerCase() === "p");
    }

    /** @private */
    insertInlineImageInLegalParent(imageInfo) {
        let newImage = imageInfo.createImgImageElement("span");
        this.wrappingElement.replaceWith(newImage);
    }

    /** @private */
    insertBlockImageInLegalParent(parent, imageInfo) {
        // Under XHTML, <div> not allowed to be a child of a <p> element, (or <i>, <u>, <s> etc.)
        let nodeAfter = this.wrappingElement;
        while (util.isInlineElement(parent) && (parent.parentNode != null)) {
            nodeAfter = parent;
            parent = parent.parentNode;
        }
        if (this.isParagraph(parent)) {
            nodeAfter = parent;
        }
        let newImage = imageInfo.createImageElement(this.userPreferences);
        nodeAfter.parentNode.insertBefore(newImage, nodeAfter);
        util.removeHeightAndWidthStyleFromParents(newImage);
        this.copyCaption(newImage, this.wrappingElement);
        this.wrappingElement.remove();
    }

    copyCaption(newImage, oldWrapper) {
        let thumbCaption = oldWrapper.querySelector("div.thumbcaption");
        if (thumbCaption != null) {
            for (let magnify of thumbCaption.querySelectorAll("div.magnify")) {
                magnify.remove();
            }
            if (!util.isNullOrEmpty(thumbCaption.textContent)) {
                newImage.appendChild(thumbCaption);
            }
        }
    }

    /**
     * @private
     */
    isDuplicateImageToRemove(imageInfo) {
        return this.userPreferences.removeDuplicateImages.value && 
            this.isElementInImageGallery() && (imageInfo.isOutsideGallery || imageInfo.isCover);
    }

    /**
     * @private
     */
    isElementInImageGallery() {
        return (this.wrappingElement.className === "thumb");
    }
}
