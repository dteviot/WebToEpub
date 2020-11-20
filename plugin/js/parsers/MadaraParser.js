"use strict";

parserFactory.register("listnovel.com", () => new MadaraParser());
parserFactory.register("readwebnovel.xyz", () => new MadaraParser());
parserFactory.register("wuxiaworld.site", () => new MadaraParser());
parserFactory.register("pery.info", () => new MadaraParser());
parserFactory.register("morenovel.net", () => new MadaraParser());
parserFactory.register("nightcomic.com", function() { return new MadaraParser() });
parserFactory.register("webnovel.live", function() { return new MadaraParser() });
parserFactory.register("noveltrench.com", function() { return new MadaraParser() });
parserFactory.register("mangasushi.net", function() { return new MadaraParser() });
parserFactory.register("mangabob.com", function() { return new MadaraParser() });


parserFactory.registerRule(
    // return probability (0.0 to 1.0) web page is a Madara Themed page
    function(url, dom) {
        return MadaraParser.isMadaraTheme(dom) * 0.6;
    },
    function() { return new MadaraParser() }
);

class MadaraParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    static isMadaraTheme(dom) {
        return 0 < dom.querySelectorAll("li.wp-manga-chapter a").length;
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a:not([title])")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
    }

    findContent(dom) {
        let content = dom.querySelector("div.reading-content");
        for(let i of content.querySelectorAll("img")) {
            let data_src = i.getAttribute("data-src");
            if (!util.isNullOrEmpty(data_src) && util.isNullOrEmpty(i.src)) {
                i.src = data_src;
            }
        }
        return content;
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.addtoany_share_save_container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("ol.breadcrumb li.active").textContent;
    }
 
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "script");
    }
}
