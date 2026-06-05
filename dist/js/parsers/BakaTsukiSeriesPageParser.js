/*
  Parses "Series Page" web page on www.baka-tsuki.org
  (i.e. Has volumes in a series and links to chapters)
*/
"use strict";

parserFactory.registerManualSelect(
    "Baka-Tsuki Series Page", 
    () => new BakaTsukiSeriesPageParser()
);

class BakaTsukiSeriesPageParser extends Parser {
    constructor() {
        super(new BakaTsukiImageCollector());
    }

    static register() {
        parserFactory.reregister(
            "baka-tsuki.org", 
            function(url) {
                if (BakaTsukiSeriesPageParser.isFullTextPage(url)) {
                    return new BakaTsukiParser(new BakaTsukiImageCollector());
                } else {
                    return new BakaTsukiSeriesPageParser();
                }
            }
        );
    }

    static registerBakaParsers(includeSeriesPage) {
        if (includeSeriesPage) {
            BakaTsukiSeriesPageParser.register();
        } else {
            BakaTsukiParser.register();
        }
    }

    static isFullTextPage(url) {
        let param = util.getParamFromUrl(url, "title");
        return param.includes(":");
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div#content");
        return Promise.resolve(util.hyperlinksToChapterList(menu, 
            BakaTsukiSeriesPageParser.possibleChapterLink));
    }

    static possibleChapterLink(link) {
        let href = link.href;
        return !href.includes("#") && !href.includes("redlink=1");
    }

    findContent(dom) {
        return dom.querySelector("div#mw-content-text");
    }

    populateUIImpl() {
        document.getElementById("highestResolutionImagesRow").hidden = false;
        document.getElementById("unSuperScriptAlternateTranslations").hidden = false; 
        document.getElementById("translatorRow").hidden = false;
        document.getElementById("fileAuthorAsRow").hidden = false;
    }

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector("#firstHeading");
    }

    customRawDomToContentStep(chapter, content) {
        BakaTsukiParser.stripGalleryBox(content);
        if (this.userPreferences.unSuperScriptAlternateTranslations.value) {
            BakaTsukiParser.unSuperScriptAlternateTranslations(content);
        }
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
