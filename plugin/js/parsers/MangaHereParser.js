/*
  Parses Manga
*/
"use strict";

parserFactory.register("www.mangahere.cc", function() { return new MangaHereParser() });

class MangaHereImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    selectImageUrlFromImagePage(dom) {
        return dom.querySelector("section#viewer img#image").src;
    }
}

class MangaHereParser extends Parser {
    constructor() {
        super(new MangaHereImageCollector());
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.detail_list a")]
            .map(a => util.hyperLinkToChapter(a, null));
        return Promise.resolve(chapters.reverse());
    }

    // find the node(s) holding the story content
    findContent(dom) {
        const className = "webToEpubContent";
        let content = dom.querySelector("div." + className);
        if (content === null) {
            let select =  dom.querySelector(".readpage_top div.go_page span.right select");
            if (select !== null) {
                content = dom.createElement("div");
                content.className = className;
                dom.body.appendChild(content);
                this.convertSelectToImgTagsToFollow(dom, content, select);
            }
        }
        return content;
    }

    convertSelectToImgTagsToFollow(dom, content, select) {
        let options = Array.from(select.querySelectorAll("option"));
        for(let option of options.filter(o => !o.value.includes("featured"))) {
            let img = dom.createElement("img");
            img.src = option.value;
            content.appendChild(img);
        };
        
        // first image in list is current page, so replace with image URL 
        // to skip fetching this page again
        let firstImg = this.imageCollector.selectImageUrlFromImagePage(dom);
        content.querySelector("img").src = firstImg;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.manga_detail_top");
    }
    
    // can't use standard implementation, as "select" tag is wanted
    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        util.removeElements(webPageDom.querySelectorAll("iframe"));
    }
}
