"use strict";

/** Keep track of how to user tells us to parse different sites */
class DefaultParserSiteSettings {
    constructor() {
        this.loadSiteConfigs();
    }

    /** @private */
    loadSiteConfigs() {
        let config = window.localStorage.getItem(DefaultParserSiteSettings.storageName);
        this.configs = new Map();
        if (config != null) {
            for (let e of JSON.parse(config)) {
                let selectors = e[1];
                if (DefaultParserSiteSettings.isConfigValid(selectors)) {
                    this.configs.set(e[0], selectors);
                }
            }
        }
    }

    static isConfigValid(selectors) {
        return (selectors.contentCss !== undefined)
            && !util.isNullOrEmpty(selectors.contentCss);
    }

    saveSiteConfig(hostname, contentCss, titleCss, removeCss, testUrl) {
        if (this.isConfigChanged(hostname, contentCss, titleCss, removeCss, testUrl)) {
            this.configs.set(
                hostname, { 
                    contentCss: contentCss, 
                    titleCss: titleCss, 
                    removeCss: removeCss,
                    testUrl: testUrl 
                }
            );
            let serialized = JSON.stringify(Array.from(this.configs.entries()));
            window.localStorage.setItem(DefaultParserSiteSettings.storageName, serialized);
        }
    }

    /** @private */
    isConfigChanged(hostname, contentCss, titleCss, removeCss, testUrl) {
        let config = this.configs.get(hostname);
        return (config === undefined) || 
            (contentCss !== config.contentCss) ||
            (titleCss !== config.titleCss) || 
            (removeCss !== config.removeCss) ||
            (testUrl !== config.testUrl);
    }

    getConfigForSite(hostname) {
        return this.configs.get(hostname);
    }

    constructFindContentLogicForSite(hostname) {
        let logic = {
            findContent: dom => dom.querySelector("body"),
            findChapterTitle: () => null,
            removeUnwanted: () => null
        };
        let config = this.getConfigForSite(hostname);
        if (config != null) {
            logic.findContent = dom => dom.querySelector(config.contentCss);
            if (!util.isNullOrEmpty(config.titleCss))
            {
                logic.findChapterTitle = dom => dom.querySelector(config.titleCss);
            }
            if (!util.isNullOrEmpty(config.removeCss))
            {
                logic.removeUnwanted = (element) => {
                    for (let e of element.querySelectorAll(config.removeCss)) {
                        e.remove();
                    }
                };
            }
        }
        return logic;
    }
}
DefaultParserSiteSettings.storageName = "DefaultParserConfigs";

/** Class that handles UI for configuring the Default Parser */
class DefaultParserUI { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static setupDefaultParserUI(hostname, parser) {
        DefaultParserUI.copyInstructions();
        DefaultParserUI.setDefaultParserUiVisibility(true);
        DefaultParserUI.populateDefaultParserUI(hostname, parser);
        document.getElementById("testDefaultParserButton").onclick = DefaultParserUI.testDefaultParser.bind(null, parser);
        document.getElementById("finisheddefaultParserButton").onclick = DefaultParserUI.onFinishedClicked.bind(null, parser);
    }

    static onFinishedClicked(parser) {
        DefaultParserUI.AddConfiguration(parser);
        DefaultParserUI.setDefaultParserUiVisibility(false);
    }

    static AddConfiguration(parser) {
        let hostname = DefaultParserUI.getDefaultParserHostnameInput().value;
        let contentCss = DefaultParserUI.getContentCssInput().value;
        let titleCss = DefaultParserUI.getChapterTitleCssInput().value;
        let removeCss = DefaultParserUI.getUnwantedElementsCssInput().value.trim();
        let testUrl = DefaultParserUI.getTestChapterUrlInput().value.trim();

        parser.siteConfigs.saveSiteConfig(hostname, contentCss, titleCss, removeCss, testUrl);
    }

    static populateDefaultParserUI(hostname, parser) {
        DefaultParserUI.getDefaultParserHostnameInput().value = hostname;

        DefaultParserUI.getContentCssInput().value = "body";
        DefaultParserUI.getChapterTitleCssInput().value = "";
        DefaultParserUI.getUnwantedElementsCssInput().value = "";
        DefaultParserUI.getTestChapterUrlInput().value = "";

        let config = parser.siteConfigs.getConfigForSite(hostname);
        if (config != null) {
            DefaultParserUI.getContentCssInput().value = config.contentCss;
            DefaultParserUI.getChapterTitleCssInput().value = config.titleCss;
            DefaultParserUI.getUnwantedElementsCssInput().value = config.removeCss;
            DefaultParserUI.getTestChapterUrlInput().value = config.testUrl;
        }
    }

    static setDefaultParserUiVisibility(isVisible) {
        // toggle mode
        ChapterUrlsUI.setVisibleUI(!isVisible);
        if (isVisible) {
            ChapterUrlsUI.getEditChaptersUrlsInput().hidden = true;
            ChapterUrlsUI.modifyApplyChangesButtons(button => button.hidden = true);
            document.getElementById("editURLsHint").hidden = true;
        }
        document.getElementById("defaultParserSection").hidden = !isVisible;
    }

    static async testDefaultParser(parser) {
        DefaultParserUI.AddConfiguration(parser);
        let hostname = DefaultParserUI.getDefaultParserHostnameInput().value;
        let config = parser.siteConfigs.getConfigForSite(hostname);
        if (util.isNullOrEmpty(config.testUrl))
        {
            alert(UIText.Warning.warningNoChapterUrl);
            return;
        }
        try {
            let xhr = await HttpClient.wrapFetch(config.testUrl);
            let webPage = { rawDom: util.sanitize(xhr.responseXML.querySelector("*")) };
            let content = parser.findContent(webPage.rawDom);
            if (content === null) {
                let errorMsg = UIText.Error.errorContentNotFound(config.testUrl);
                throw new Error(errorMsg);
            }
            parser.removeUnwantedElementsFromContentElement(content);
            parser.addTitleToContent(webPage, content);
            DefaultParserUI.showResult(content);
        } catch (err) {
            ErrorLog.showErrorMessage(err);
        }
    }

    static cleanResults() {
        let resultElement = DefaultParserUI.getResultViewElement();
        let children = resultElement.childNodes;
        while (0 < children.length) {
            children[children.length - 1].remove();
        }
    }

    static copyInstructions() {
        let content = document.getElementById("defaultParserInstructions");
        DefaultParserUI.showResult(content);
    }

    static showResult(content) {
        DefaultParserUI.cleanResults();
        if (content != null) {
            let resultElement = DefaultParserUI.getResultViewElement();
            util.moveChildElements(content, resultElement);
        }
    }

    static getDefaultParserHostnameInput() {
        return document.getElementById("defaultParserHostName");
    }

    static getContentCssInput() {
        return document.getElementById("defaultParserContentCss");
    }

    static getChapterTitleCssInput() {
        return document.getElementById("defaultParserChapterTitleCss");
    }

    static getUnwantedElementsCssInput() {
        return document.getElementById("defaultParserUnwantedElementsCss");
    }

    static getTestChapterUrlInput() {
        return document.getElementById("defaultParserTestChapterUrl");
    }

    static getResultViewElement() {
        return document.getElementById("defaultParserVewResult");
    }
}

