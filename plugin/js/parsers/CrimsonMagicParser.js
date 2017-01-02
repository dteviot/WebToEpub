/*
  parses crimsonmagic.me & skythewoodtl.com
  1. Convert <a> tags that are links to imgur images to <img> tags
  2. expands Chapter URLs that are imgur image galleries
*/
"use strict";

parserFactory.register("crimsonmagic.me", function() { return new CrimsonMagicParser() });
parserFactory.register("skythewoodtl.com", function() { return new CrimsonMagicParser() });

class CrimsonMagicParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        if (ImgurParser.isImgurGallery(dom)) {
            return ImgurParser.convertGalleryToConventionalForm(dom);
        }
        let content = super.findContent(dom);
        if (content != null) {
            ImgurParser.replaceImgurLinksWithImages(content);
        }
        return content;
    }
}
