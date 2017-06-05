/*
  This holds code for transforming an imgur gallery into content image collector can handle
  Note, despite it's name, this IS NOT an actual parser.  But it may become one later.
*/
"use strict";

class ImgurParser {
    constructor() {
    }

    static isImgurGallery(dom) {
        let host = util.extractHostName(dom.baseURI).toLowerCase();
        return ImgurParser.isImgurHostName(host);
    }

    static isImgurHostName(host) {
        return (host === "imgur.com") || (host.endsWith(".imgur.com"));
    }

    static convertGalleryToConventionalForm(dom) {
        let imagesList = ImgurParser.findImagesList(dom);
        return (imagesList == null) ? null : ImgurParser.constructStandardHtmForImgur(imagesList);
    }

    static constructStandardHtmForImgur(imagesList) {
        let doc = document.implementation.createHTMLDocument();
        let div = doc.createElement("div");
        doc.body.appendChild(div);
        for(let item of imagesList) {
            let img = doc.createElement("img");
            // ToDo: use real image to build URI
            img.src = "http://i.imgur.com/" + item.hash + item.ext;
            div.appendChild(img);
        };
        return div;
    }

    static findImagesList(dom) {
        let json = ImgurParser.findImagesJson(dom);
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
        for(let script of util.getElements(dom, "script")) {
            let text = script.innerHTML;
            let index = text.indexOf("_item:")
            if (0 <= index) {
                index = text.indexOf("{", index);
                if (0 < index) {
                    let end = util.findIndexOfClosingBracket(text, index);
                    let jsonString = text.substring(index, end + 1);
                    return JSON.parse(jsonString);
                }
            }
        };
        return null;
    }

    static isHyperlinkToImgurGallery(hyperlink) {
        return ImgurParser.isImgurHostName(hyperlink.hostname)
          && !ImageCollector.linkContainsImageTag(hyperlink)
          && ImgurParser.isLinkToGallery(hyperlink);
    }

    /** @private 
     * Hack, assume if no extension, it's a gallery
    */
    static isLinkToGallery(hyperlink) {
        return !util.extractFilename(hyperlink).includes(".");
    }

    static replaceGalleryHyperlinkWithImages(link, galleryDom) {
        if (ImgurParser.isImgurGallery(galleryDom)) {
            let images =  ImgurParser.convertGalleryToConventionalForm(galleryDom);
            link.replaceWith(images);
        }       
    }

    static getGalleryLinksToReplace(dom) {
        return util.getElements(dom, "a", ImgurParser.isHyperlinkToImgurGallery);
    }

    static fixupImgurGalleryUrl(url) {
        let link = document.createElement("a");
        link.href = url;
        if (ImgurParser.isHyperlinkToImgurGallery(link) && !url.endsWith("?grid")) {
            return url + "?grid";
        }
        return url;
    }
}
