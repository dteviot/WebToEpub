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

    getChapterUrls(dom) {
        let that = this;
        return super.getChapterUrls(dom).then(function (chapters) {
            that.fixupImgurGalleryChapters(chapters);
            return Promise.resolve(chapters);
        });
    }

    fixupImgurGalleryChapters(chapters) {
        for(let c of chapters) {
            c.sourceUrl = ImgurParser.fixupImgurGalleryUrl(c.sourceUrl);
        }
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

    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let dom = xhr.responseXML;
            var sequence = Promise.resolve();
            let galleriesToExpand = ImgurParser.getGalleryLinksToReplace(dom);
            galleriesToExpand.forEach(function (link) {
                sequence = sequence.then(function () {
                    let href = ImgurParser.fixupImgurGalleryUrl(link.href);
                    return HttpClient.wrapFetch(href).then(function (xhr) {
                        ImgurParser.replaceGalleryHyperlinkWithImages(link, xhr.responseXML);
                        return Promise.resolve();
                    })
                })
            });
            sequence = sequence.then(function () {
                return Promise.resolve(dom);
            });
            return sequence; 
        });
    }
}
