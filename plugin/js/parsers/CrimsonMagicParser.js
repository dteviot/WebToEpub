/*
  parses crimsonmagic.me
  Convert <a> tags that are links to imgur images to <img> tags
*/
"use strict";

parserFactory.register("crimsonmagic.me", function() { return new CrimsonMagicParser() });

class CrimsonMagicParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        let content = super.findContent(dom);
        if (content != null) {
            let that = this;
            let toReplace = util.getElements(content, "a", that.isHyperlinkToReplace);
            for(let hyperlink of toReplace) {
                that.replaceHyperlinkWithImg(hyperlink);
            }
        }
        return content;
    }

    isHyperlinkToReplace(hyperlink) {
        // must go to imgur site 
        let host = hyperlink.hostname;
        if ((host !== "imgur.com") && (host !== "i.imgur.com")) {
            return false;
        }

        // must not contain an image 
        return (util.getElements(hyperlink, "img").length === 0);
    }

    replaceHyperlinkWithImg(hyperlink) {
        let img = hyperlink.ownerDocument.createElement("img");
        img.src = hyperlink.href;
        hyperlink.replaceWith(img);
    }
    
}
