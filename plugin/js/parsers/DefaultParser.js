/*
  Parser used when can't match a parser for the document
*/
"use strict";

parserFactory.registerManualSelect(
    "Default", 
    function() { return new DefaultParser(); }
);

class DefaultParser extends Parser {
    constructor() {
        super();
        this.siteConfigs = new DefaultParserSiteSettings();
        this.logic = null;
    }

    getChapterUrls(dom) {
        return Promise.resolve(util.hyperlinksToChapterList(dom.body));
    }

    findContent(dom) {
        let hostName = util.extractHostName(dom.baseURI);
        this.logic = this.siteConfigs.constructFindContentLogicForSite(hostName);
        return this.logic.findContent(dom); 
    }

    populateUI(dom) {
        super.populateUI(dom);
        let hostname = util.extractHostName(dom.baseURI);
        DefaultParserUI.setupDefaultParserUI(hostname, this);
    }

    // override default (keep nearly everything, may be wanted)
    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("script[src], iframe"));
        util.removeComments(element);
        util.removeUnwantedWordpressElements(element);
        util.removeMicrosoftWordCrapElements(element);
        this.logic.removeUnwanted(element);
    }

    findChapterTitle(dom) {
        return this.logic.findChapterTitle(dom);
    }
}
