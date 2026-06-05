/*
  parses imgur galleries
*/
"use strict";

parserFactory.register("imgur.com", () => new ImgurParser());

parserFactory.registerUrlRule(
    url => Imgur.isImgurHostName(util.extractHostName(url).toLowerCase()),
    () => new ImgurParser()
);

class ImgurParser extends Parser {
    constructor() {
        super();
    }

    findContent(dom) {
        return Imgur.convertGalleryToConventionalForm(dom);
    }
}
