/*
  parser for http://novelplanet.com
*/
"use strict";

// Use one or more of these to specify when the parser is to be used
parserFactory.register("novelplanet.com", function() { return new NovelPlanetParser() });

class NovelPlanetParser extends Parser{
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    getChapterUrls(dom) {
        let chapters = null;
        let chapterListHeader = dom.querySelector("h3");
        if (chapterListHeader !== null)
        {
            chapters = util.hyperlinksToChapterList(chapterListHeader.parentElement);
        } else {
            let chapterLinks = dom.querySelector("a[title]");
            chapters = chapterLinks.map(a => util.hyperLinkToChapter(a)); 
        }
        return Promise.resolve(chapters.reverse());
    };

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return dom.querySelector("div#divReadContent");
    };

    // title of the story
    extractTitleImpl(dom) {
        return dom.querySelector("a.title");
    };

    extractAuthor(dom) {
        let element = dom.querySelector("a[href*='?author=']");
        return (element === null) ? super.extractAuthor(dom) : element.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.post-previewInDetails");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h4");
    }
 
    getInformationEpubItemChildNodes(dom) {
        let nodes = [];
        let summary = dom.querySelector("div.post-contentDetails");
        if (summary != null) {
            summary = summary.parentElement;
            nodes.push(summary);
            this.cleanInformationNode(summary);
        }
        return nodes;
    }

    cleanInformationNode(node) {
        let toRemove = [...node.querySelectorAll("div.post-previewInDetails, div.clsButtonSmall, div.addthis_inline_share_toolbox, hr")];
        util.removeElements(toRemove);
    }
}
