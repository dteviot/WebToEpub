/*
  parses crimsonmagic.me & skythewoodtl.com
  1. Convert <a> tags that are links to imgur images to <img> tags
  2. expands Chapter URLs that are imgur image galleries
*/
"use strict";

parserFactory.register("crimsonmagic.me", function() { return new CrimsonMagicParser() });
parserFactory.register("skythewoodtl.com", function() { return new CrimsonMagicParser() });
parserFactory.register("bakapervert.wordpress.com", function() { return new CrimsonMagicParser() });

class CrimsonMagicParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        return super.getChapterUrls(dom).then(function (chapters) {
            that.fixupImgurGalleryChapters(chapters);
            return Promise.resolve(chapters);
        });
    }

    fixupImgurGalleryChapters(chapters) {
        for(let c of chapters) {
            c.sourceUrl = Imgur.fixupImgurGalleryUrl(c.sourceUrl);
        }
    }

    findContent(dom) {
        if (Imgur.isImgurGallery(dom)) {
            return Imgur.convertGalleryToConventionalForm(dom);
        }
        let content = super.findContent(dom);
        return content;
    }
}
