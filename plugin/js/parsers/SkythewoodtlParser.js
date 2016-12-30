/*
  parses skythewoodtl.com
  expands out links that are imgur image galleries
*/
"use strict";

parserFactory.register("skythewoodtl.com", function() { return new SkythewoodtlParser() });

class SkythewoodtlParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        if (ImgurParser.isImgurGallery(dom)) {
            return ImgurParser.convertGalleryToConventionalForm(dom);
        } else {
            return super.findContent(dom);
        }
    }
}
