"use strict";

parserFactory.registerManualSelect(
    "Default", 
    () => new DefaultParser()
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
        // Pass the preloaded live DOM to the UI initialization
        DefaultParserUI.setupDefaultParserUI(hostname, this, dom);
    }

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