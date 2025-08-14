"use strict";

parserFactory.register("listnovel.com", () => new MadaraParser());
//dead url
parserFactory.register("readwebnovel.xyz", () => new MadaraParser());
parserFactory.register("wuxiaworld.site", () => new MadaraParser());
//dead url
parserFactory.register("pery.info", () => new MadaraParser());
parserFactory.register("morenovel.net", () => new MadaraParser());
parserFactory.register("nightcomic.com", () => new MadaraParser());
//dead url
parserFactory.register("webnovel.live", () => new MadaraParser());
//dead url
parserFactory.register("noveltrench.com", () => new MadaraParser());
parserFactory.register("mangasushi.net", () => new MadaraParser());
//dead url
parserFactory.register("mangabob.com", () => new MadaraParser());
parserFactory.register("greenztl2.com", () => new MadaraVariantParser());

parserFactory.register("kdtnovels.com", () => new KdtnovelsParser());

parserFactory.registerRule(
    (url, dom) => MadaraParser.isMadaraTheme(dom) * 0.6,
    () => new MadaraParser()
);

class MadaraParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    static isMadaraTheme(dom) {
        return 0 < dom.querySelectorAll("li.wp-manga-chapter a").length;
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a:not([title])")]
            .map(a => util.hyperLinkToChapter(a)).reverse();
        //if single chapter result, try MadaraVariantParser logic.
    }

    findContent(dom) {
        let content =
            dom.querySelector(".reading-content .text-left") ||
            dom.querySelector("div.reading-content");

        for (let i of content.querySelectorAll("img")) {
            let data_src = i.getAttribute("data-src");
            if (!util.isNullOrEmpty(data_src) && util.isNullOrEmpty(i.src)) {
                i.src = data_src.trim();
            }
        }
        return content;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }
	
    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("div .genres-content [rel='tag']")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        let descriptionElement = dom.querySelector(".summary__content");
        return descriptionElement === null ? "" : descriptionElement.textContent.trim();
    }
    

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.addtoany_share_save_container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("ol.breadcrumb li.active, .wp-manga-chapter.reading a").textContent;
    }
 
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.summary__content")];
        if (nodes.length === 0) {
            nodes = [...dom.querySelectorAll("div.manga-summary p")];
        }
        return nodes;
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script");
    }
}

class MadaraVariantParser extends MadaraParser {
    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a:not([title], [data-locked='1'])")]
            .map(a => this.hyperLinkToChapter(a)).reverse();
    }

    hyperLinkToChapter(link, newArc) {
        let retVal = util.hyperLinkToChapter(link, newArc);
        let uri = retVal.sourceUrl;
        if (!uri || link.attributes.href.value == "#") //search for alternate URLs if typical link fails
        {
            uri = null;
            if (link.dataset.link)
            {
                retVal.sourceUrl = link.dataset.link;
            }
            else
            {
                [...link.attributes].forEach(attr => {
                    try {
                        uri = new URL(attr.value);
                    } catch (_)
                    {
                        //Failed to detect URL in Attribute.
                    }
                });
                if (uri && uri.href)
                {
                    retVal.sourceUrl = uri.href;
                }
            }
        }

        return retVal;
    }
    
    findChapterTitle(dom) {
        return dom.querySelector(".main-col h1:not(.menu-title)").textContent;
    }
}

class KdtnovelsParser extends MadaraParser {
    findChapterTitle(dom) {
        return dom.querySelector("h3.chapter-name");
    }
}
