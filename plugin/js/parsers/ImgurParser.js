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
        return (imagesList == null) ? [] : ImgurParser.constructStandardHtmForImgur(imagesList);
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
        // Ugly hack, need to find the list of images as image links are created dynamically in HTML.
        // Obviously this will break each time imgur change their scripts.
        for(let script of util.getElements(dom, "script")) {
            let text = script.innerHTML;
            let index = text.indexOf("\"images\":[{\"hash\"");
            if (index !== -1) {
                text = text.substring(index + 9);
                let endIndex = text.indexOf("}]");
                if (endIndex !== -1) {
                    return JSON.parse(text.substring(0, endIndex + 2));
                }
            }
        }
    }

    static replaceImgurLinksWithImages(content) {
        let toReplace = util.getElements(content, "a", ImgurParser.isHyperlinkToReplace);
        for(let hyperlink of toReplace) {
            ImgurParser.replaceHyperlinkWithImg(hyperlink);
        }
    }

    /** @private */
    static isHyperlinkToReplace(hyperlink) {
        // must go to imgur site 
        if (!ImgurParser.isImgurHostName(hyperlink.hostname)) {
            return false;
        }

        if (ImgurParser.linkContainsImageTag(hyperlink)) {
            return false;
        }

        return !ImgurParser.isLinkToGallery(hyperlink);
    }

    /** @private */
    static linkContainsImageTag(hyperlink) {
        return (util.getElements(hyperlink, "img").length !== 0);
    }

    /** @private */
    static replaceHyperlinkWithImg(hyperlink) {
        let img = hyperlink.ownerDocument.createElement("img");
        img.src = hyperlink.href;
        hyperlink.replaceWith(img);
    }

    /** @private 
     * Hack, assume if no extension, it's a gallery
    */
    static isLinkToGallery(hyperlink) {
        let filenames = hyperlink.pathname.split("/");
        let filename = filenames[filenames.length - 1];
        return !filename.includes(".");
    }
}
