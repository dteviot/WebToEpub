/*
  This holds code for transforming an imgur gallery into content image collector can handle
*/
"use strict";

class Imgur { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static expandGalleries(content, parentPageUrl) {
        let sequence = Promise.resolve();
        for (let link of Imgur.getGalleryLinksToReplace(content)) {
            sequence = sequence.then(() => {
                let href = Imgur.fixupImgurGalleryUrl(link.href);
                return HttpClient.wrapFetch(href).then((xhr) => {
                    Imgur.replaceGalleryHyperlinkWithImages(link, xhr.responseXML);
                    return Promise.resolve();
                }).catch((err) => {
                    let errorMsg = UIText.Error.imgurFetchFailed(link.href, parentPageUrl, err);
                    ErrorLog.log(errorMsg);
                    return Promise.resolve();
                });
            });
        }
        sequence = sequence.then(() => {
            return Promise.resolve(content);
        });
        return sequence; 
    }

    static isImgurGallery(dom) {
        let host = util.extractHostName(dom.baseURI).toLowerCase();
        return Imgur.isImgurHostName(host);
    }

    static isImgurHostName(host) {
        return (host === "imgur.com") || (host.endsWith(".imgur.com"));
    }

    static convertGalleryToConventionalForm(dom) {
        let imagesList = Imgur.findImagesList(dom);
        return (imagesList == null) ? null : Imgur.constructStandardHtmForImgur(imagesList);
    }

    static constructStandardHtmForImgur(imagesList) {
        let doc = document.implementation.createHTMLDocument();
        let div = doc.createElement("div");
        doc.body.appendChild(div);
        for (let item of imagesList) {
            let img = doc.createElement("img");
            // ToDo: use real image to build URI
            img.src = "http://i.imgur.com/" + item.hash + item.ext;
            div.appendChild(img);
        }
        return div;
    }

    static findImagesList(dom) {
        let json = Imgur.findImagesJson(dom);
        if (json != null) {
            if (json.album_images != null) {
                return json.album_images.images;
            } else {
                return [ json ];
            }
        }
    }

    static findImagesJson(dom) {
        // Ugly hack, need to find the list of images as image links are created dynamically in HTML.
        // Obviously this will break each time imgur change their scripts.
        for (let text of Imgur.scriptsWithRunSlots(dom)) {
            let json = util.locateAndExtractJson(text, "item:");
            if (json != null) {
                return json;
            }
        }
        return null;
    }

    static scriptsWithRunSlots(dom) {
        return [...dom.querySelectorAll("script")]
            .map(s => s.innerHTML)
            .filter(i => (0 <= i.indexOf("window.runSlots")));
    }

    static isHyperlinkToImgurGallery(hyperlink) {
        return Imgur.isImgurHostName(hyperlink.hostname)
          && !ImageCollector.linkContainsImageTag(hyperlink)
          && Imgur.isLinkToGallery(hyperlink);
    }

    /** @private 
     * Hack, assume if no extension, it's a gallery
    */
    static isLinkToGallery(hyperlink) {
        return !util.extractFilename(hyperlink).includes(".");
    }

    static replaceGalleryHyperlinkWithImages(link, galleryDom) {
        if (Imgur.isImgurGallery(galleryDom)) {
            let images =  Imgur.convertGalleryToConventionalForm(galleryDom);
            link.replaceWith(images);
        }       
    }

    static getGalleryLinksToReplace(dom) {
        return util.getElements(dom, "a", Imgur.isHyperlinkToImgurGallery);
    }

    static fixupImgurGalleryUrl(url) {
        let link = document.createElement("a");
        link.href = url;
        if (Imgur.isHyperlinkToImgurGallery(link) && !url.endsWith("?grid")) {
            return url + "?grid";
        }
        return url;
    }
}
