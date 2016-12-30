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
        return (host === "imgur.com") || (host === "i.imgur.com");
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
}
