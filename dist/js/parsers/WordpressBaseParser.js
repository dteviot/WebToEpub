/*
  Basic functionality for parsing wordpress (I hope)
*/
"use strict";

parserFactory.register("bakapervert.wordpress.com", () => new WordpressBaseParser());
parserFactory.register("crimsonmagic.me", () => new WordpressBaseParser());
parserFactory.register("shalvationtranslations.wordpress.com", () => new WordpressBaseParser());
parserFactory.register("frostfire10.wordpress.com", () => new WordpressBaseParser());
parserFactory.register("isekaicyborg.wordpress.com", () => new WordpressBaseParser());
parserFactory.register("moonbunnycafe.com", () => new WordpressBaseParser());
//dead url
parserFactory.register("rainingtl.org", () => new WordpressBaseParser());
//dead url
parserFactory.register("raisingthedead.ninja", () => new WordpressBaseParser());
//dead url
parserFactory.register("skythewoodtl.com", () => new WordpressBaseParser());
//dead url
parserFactory.register("yoraikun.wordpress.com", () => new WordpressBaseParser());
parserFactory.register("wanderertl130.id", () => new Wanderertl130Parser());
parserFactory.register("sasakitomyiano.wordpress.com", () => new WordpressBaseParser());

parserFactory.registerRule(
    // return probability (0.0 to 1.0) web page is a Wordpress page
    function(url, dom) {
        return ((WordpressBaseParser.findContentElement(dom) != null) &&
            (WordpressBaseParser.findChapterTitleElement(dom) != null)) * 0.5;
    },
    () => new WordpressBaseParser()
);

parserFactory.registerManualSelect(
    "Wordpress",
    () => new WordpressBaseParser()
);

class WordpressBaseParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let content = this.findContent(dom).cloneNode(true);
        this.removeUnwantedElementsFromContentElement(content);
        return util.hyperlinksToChapterList(content);
    }

    static findContentElement(dom) {
        return dom.querySelector("div.entry-content") ||
            dom.querySelector("div.post-content") ||
            dom.querySelector("ul.wp-block-post-template") ||
            dom.querySelector(".wp-block-cover__inner-container");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return WordpressBaseParser.findContentElement(dom);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "next" and "previous" chapter links may be inside <strong> then <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    static findChapterTitleElement(dom) {
        return dom.querySelector(".entry-title") ||
            dom.querySelector(".page-title") ||
            dom.querySelector("header.post-title h1") ||
            dom.querySelector(".post-title") ||
            dom.querySelector("#chapter-heading") ||
            dom.querySelector(".wp-block-post-title");
    }

    findChapterTitle(dom) {
        return WordpressBaseParser.findChapterTitleElement(dom);
    }
}

class Wanderertl130Parser extends  WordpressBaseParser {
    constructor() {
        super();
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let footnotes = [...webPageDom.querySelectorAll("span.modern-footnotes-footnote__note")];
        this.moveFootnotes(webPageDom, content, footnotes);
    }
}
