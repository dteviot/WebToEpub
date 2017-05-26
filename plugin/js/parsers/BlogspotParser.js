/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.register("sousetsuka.com", function() { return new BlogspotParser() });
parserFactory.registerRule(
    function(url, dom) {
        return (util.extractHostName(url).indexOf(".blogspot.") != -1) ||
            (BlogspotParser.findContentElement(dom) != null); 
    }, 
    function() { return new BlogspotParser() }
);

parserFactory.registerManualSelect(
    "Blogspot", 
    function() { return new BlogspotParser() }
);

class BlogspotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    static findContentElement(dom) {
        let content = util.getElement(dom, "div", e => e.className.startsWith("post-body"));
        if (content === null ) {
            content = util.getElement(dom, "div", e => e.className === "pagepost");
            if (content !== null) {
                content = util.getElement(content, "div", e => e.className === "cover");
            }
        }
        return content;
    }

    findContent(dom) {
        //---------------------------------------------------
        // Hack, fix for one of the image galleries for skythewood
        // ToDo.  Base class to pick parser on per URL basis.
        if (ImgurParser.isImgurGallery(dom)) {
            return ImgurParser.convertGalleryToConventionalForm(dom);
        }
        //---------------------------------------------------
        let content = BlogspotParser.findContentElement(dom);
        if (content == null) {
            content = util.getElement(dom, "div", e => e.className.startsWith("entry-content"));
        }
        return content;
    }

    static findChapterTitleElement(dom) {
        let title = util.getElement(dom, "h3", e => e.className.startsWith("post-title"));
        if (title == null) {
            title = util.getElement(dom, "h1", e => e.className.startsWith("entry-title"));
        }
        return title;
    }

    findChapterTitle(dom) {
        return BlogspotParser.findChapterTitleElement(dom);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = util.moveIfParent(link, "span");
        return util.moveIfParent(toRemove, "div");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
