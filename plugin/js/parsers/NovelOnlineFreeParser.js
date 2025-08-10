/*
  Parser for http://novelonlinefree.com/
*/
"use strict";

parserFactory.register("novelonlinefree.com", function() { return new NovelOnlineFreeParser(); });
//dead url
parserFactory.register("novelonlinefree.info", function() { return new NovelOnlineFreeParser(); });
parserFactory.register("novelonlinefull.com", function() { return new NovelOnlineFreeParser(); });
parserFactory.register("wuxiaworld.online", function() { return new NovelOnlineFreeParser(); });
//dead url
parserFactory.register("chinesewuxia.world", function() { return new NovelOnlineFreeParser(); });
parserFactory.register("bestlightnovel.com", function() { return new NovelOnlineFreeParser(); });
//dead url
parserFactory.register("wuxia-world.online", function() { return new NovelOnlineFreeParser(); });
parserFactory.register("wuxiaworld.live", function() { return new NovelOnlineFreeParser(); });

class NovelOnlineFreeParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menuItems = [...dom.querySelectorAll("div.chapter-list a")];
        return Promise.resolve(this.buildChapterList(menuItems));
    }

    buildChapterList(menuItems) {
        return menuItems.reverse().map(
            a => ({sourceUrl: a.href, title: a.getAttribute("title")})
        );
    }
    
    findContent(dom) {
        let content = dom.querySelector("div.vung_doc")
          || dom.querySelector("div.content-area");
        return content;
    }

    // title of the story
    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let link = dom.querySelector("a[href*='search_author']");
        return (link == null) ? super.extractAuthor(dom) : link.textContent;
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.entry-header");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#noidungm, ul.truyen_info_right")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "span.rate_star, .fb_iframe_widget, div.google, button, script");
    }
}
