/*
  parses imgur gallaries
*/
"use strict";

parserFactory.register("imgur.com", function() { return new ImgurParser() });

parserFactory.registerRule(
    function(url, dom) {  // eslint-disable-line no-unused-vars
        let host = util.extractHostName(url).toLowerCase();
        return Imgur.isImgurHostName(host);
    },
    function() { return new ImgurParser() }
);

class ImgurParser extends Parser {
    constructor() {
        super();
    }

    findContent(dom) {
        return Imgur.convertGalleryToConventionalForm(dom);
    }
}
