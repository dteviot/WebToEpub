/*
  Parser used when can't match a parser for the document
*/
"use strict";

parserFactory.registerManualSelect(
    "Default", 
    function() { return new DefaultParser() }
);

/** Keep track of how to user tells us to parse different sites */
class DefaultParserSiteSettings {
    constructor() {
        this.loadSiteConfigs();
    }

    /** @private */
    loadSiteConfigs() {
        let config = window.localStorage.getItem(this.storageName);
        this.configs = new Map();
        if (config != null) {
            for(let e of JSON.parse(config)) {
                this.configs.set(e[0], e[1]);
            }
        }
    }

    saveSiteConfig(url, tag, idType, search) {
        let hostname = util.extractHostName(url);
        if (this.isConfigChanged(hostname, tag, idType, search)) {
            this.configs.set(
                hostname, { tag: tag, idType: idType, search: search }
            );
            let serialized = JSON.stringify(Array.from(this.configs.entries()));
            window.localStorage.setItem(this.storageName, serialized);
        }
    }

    /** @private */
    isConfigChanged(hostname, tag, idType, search) {
        let config = this.configs.get(hostname);
        return (config === undefined) || (tag !== config.tag) ||
            (idType !== idType) || (search !== search);
    }

    getConfigForSite(url) {
        return this.configs.get(util.extractHostName(url));
    }

    constructFindContentLogicForSite(url) {
        let config = this.getConfigForSite(url);
        if (config == null) {
            config = {tag: "body"};
        }
        let predicate = function(element) { return true; }    // eslint-disable-line no-unused-vars
        if (config.tag !== "body") {
            switch(config.idType) {
            case "classIs": 
                predicate = (e => (e.className === config.search));
                break;
            case "classStartsWith": 
                predicate = (e => e.className.startsWith(config.search));
                break;
            case "idIs": 
                predicate = (e => (e.id === config.search)); 
                break;
            case "idStartsWith": 
                predicate = (e => e.id.startsWith(config.search));
                break;
            }
        }
        return (dom => util.getElement(dom, config.tag, predicate));
    }
}
DefaultParserSiteSettings.storageName = "DefaultParserConfigs";

class DefaultParser extends Parser {
    constructor() {
        super();
        this.siteConfigs = new DefaultParserSiteSettings();
    }

    getChapterUrls(dom) {
        return Promise.resolve(util.hyperlinksToChapterList(dom.body));
    }

    onStartCollecting() {
        let url = document.getElementById("startingUrlInput").value;
        let tag = DefaultParser.getSelectContentTag().value;
        let idType = DefaultParser.getSelectContentTagIdType().value;
        let search = DefaultParser.getContentTagIdentifierInput().value.trim();
        this.siteConfigs.saveSiteConfig(url, tag, idType, search);
    }

    findContent(dom) {
        let logic = this.siteConfigs.constructFindContentLogicForSite(dom.baseURI);
        return logic(dom); 
    }

    populateUI(dom) {
        this.setUiForSite(dom.baseURI);
        super.populateUI(dom);
        document.getElementById("defaultParserSection").hidden = false;
        ErrorLog.showErrorMessage(chrome.i18n.getMessage("noParserFound"));
    }

    setUiForSite(url) {
        let config = this.siteConfigs.getConfigForSite(url);
        if (config != null) {
            DefaultParser.getSelectContentTag().value = config.tag;
            DefaultParser.getSelectContentTagIdType().value = config.idType;
            DefaultParser.getContentTagIdentifierInput().value = config.search;
        }
    }

    // override default (keep nearly everything, may be wanted)
    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("script[src], iframe"));
        util.removeComments(element);
        util.removeUnwantedWordpressElements(element);
    };

    static getSelectContentTag() {
        return document.getElementById("selectContentTag");
    }

    static getSelectContentTagIdType() {
        return document.getElementById("selectContentTagIdType");
    }

    static getContentTagIdentifierInput() {
        return document.getElementById("contentTagIdentifierInput");
    }
}
