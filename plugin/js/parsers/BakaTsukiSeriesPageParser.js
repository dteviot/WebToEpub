/*
  Parses "Series Page" web page on www.baka-tsuki.org
  (i.e. Has volumes in a series and links to chapters)
*/
"use strict";

parserFactory.register(
    "baka-tsuki.org", 
    function(url) {
        if (BakaTsukiSeriesPageParser.isFullTextPage(url)) {
            return new BakaTsukiParser(new BakaTsukiImageCollector());
        } else {
            return new BakaTsukiSeriesPageParser();
        }
    }
);

parserFactory.registerManualSelect(
    "Baka-Tsuki Series Page", 
    function() { return new BakaTsukiSeriesPageParser(); }
);

class BakaTsukiSeriesPageParser extends Parser{
    constructor() {
        super(new BakaTsukiImageCollector());
    }

    static isFullTextPage(url) {
        let param = util.getParamFromUrl(url, "title");
        return param.includes(":");
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div#content");
        return Promise.resolve(util.hyperlinksToChapterList(menu, 
            BakaTsukiSeriesPageParser.possibleChapterLink));
    };

    static possibleChapterLink(link) {
        let href = link.href;
        return !href.includes("#") && !href.includes("redlink=1");
    }

    findContent(dom) {
        return dom.querySelector("div#mw-content-text");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        return dom.querySelector("#firstHeading").textContent.trim();
    };

    customRawDomToContentStep(chapter, content) {
        BakaTsukiParser.stripGalleryBox(content);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("div#toc, div#printfooter"));

        // remove "Jump Up" text that appears beside the up arrow from translator notes
        util.removeElements(element.querySelectorAll("span.cite-accessibility-label"));

        BakaTsukiParser.removeUnwantedTable(element);

        // hyperlinks that allow editing text
        util.removeElements(element.querySelectorAll("span.mw-editsection"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("#firstHeading");
    }    
}
