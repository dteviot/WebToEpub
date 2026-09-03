"use strict";

class DefaultParserSiteSettings {
    constructor() {
        this.loadSiteConfigs();
    }

    loadSiteConfigs() {
        let config = window.localStorage.getItem(DefaultParserSiteSettings.storageName);
        this.configs = new Map();
        if (config != null) {
            try {
                for (let e of JSON.parse(config)) {
                    let selectors = e[1];
                    if (DefaultParserSiteSettings.isConfigValid(selectors)) {
                        this.configs.set(e[0], selectors);
                    }
                }
            } catch (e) {
                window.localStorage.removeItem(DefaultParserSiteSettings.storageName);
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
            logic.findContent = dom => {
                try {
                    return dom.querySelector(config.contentCss);
                } catch (e) {
                    return null; 
                }
            };
            if (!util.isNullOrEmpty(config.titleCss))
            {
                logic.findChapterTitle = dom => {
                    try {
                        return dom.querySelector(config.titleCss);
                    } catch (e) {
                        return null;
                    }
                };
            }
            if (!util.isNullOrEmpty(config.removeCss))
            {
                logic.removeUnwanted = (element) => {
                    try {
                        for (let e of element.querySelectorAll(config.removeCss)) {
                            e.remove();
                        }
                    } catch (e) {
                        // Ignore invalid CSS selector errors
                    }
                };
            }
        }
        return logic;
    }
}
DefaultParserSiteSettings.storageName = "DefaultParserConfigs";

class DefaultParserUI {
    constructor() {
    }

    static setupDefaultParserUI(hostname, parser, dom) {
        DefaultParserUI.copyInstructions();
        DefaultParserUI.setDefaultParserUiVisibility(true);
        // Pass the preloaded live DOM down to the populate method
        DefaultParserUI.populateDefaultParserUI(hostname, parser, dom);
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

    static populateDefaultParserUI(hostname, parser, dom) {
        DefaultParserUI.getDefaultParserHostnameInput().value = hostname;

        DefaultParserUI.getContentCssInput().value = "body";
        DefaultParserUI.getChapterTitleCssInput().value = "";
        DefaultParserUI.getUnwantedElementsCssInput().value = "";
        DefaultParserUI.getTestChapterUrlInput().value = "";

        let config = parser.siteConfigs.getConfigForSite(hostname);
        let activeUrl = document.getElementById("startingUrlInput").value;

        if (config != null) {
            DefaultParserUI.getContentCssInput().value = config.contentCss;
            DefaultParserUI.getChapterTitleCssInput().value = config.titleCss;
            DefaultParserUI.getUnwantedElementsCssInput().value = config.removeCss;
            DefaultParserUI.getTestChapterUrlInput().value = config.testUrl;
            return;
        }

        // Always ensure the Test URL is filled out, falling back to activeUrl
        if (!DefaultParserUI.getTestChapterUrlInput().value) {
            DefaultParserUI.getTestChapterUrlInput().value = activeUrl;
        }

        DefaultParserUI.bindSmartScanner();

        // Proactively scan using the live DOM to avoid network/403 issues.
        // This will override the old/default config purely in the UI if successful.
        if (dom && activeUrl) {
            DefaultParserUI.executeSmartScan(activeUrl, dom);
        }
    }

    static bindSmartScanner() {
        const testUrlInput = DefaultParserUI.getTestChapterUrlInput();
        
        if (!testUrlInput) return;
        if (testUrlInput.dataset.smartBound === "true") return;
        testUrlInput.dataset.smartBound = "true";

        let debounceTimer = null;

        testUrlInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            let url = testUrlInput.value.trim();
            
            if (!url) {
                const statusSpan = document.getElementById("smartDetectStatus");
                if (statusSpan) statusSpan.textContent = "";
                return;
            }

            const statusSpan = document.getElementById("smartDetectStatus");
            if (statusSpan) {
                statusSpan.textContent = "\u23F3 Detecting...";
                statusSpan.style.color = "#666";
            }

            // User manually typed a URL, we cannot use preloaded DOM anymore.
            debounceTimer = setTimeout(() => {
                DefaultParserUI.executeSmartScan(url, null);
            }, 500);
        });
    }

    static async executeSmartScan(url, preloadedDom = null) {
        const statusSpan = document.getElementById("smartDetectStatus");
        if (!statusSpan) return;

        statusSpan.textContent = "\u23F3 Detecting...";
        statusSpan.style.color = "#666";

        try {
            // Pass the preloaded DOM directly to the scanner
            let result = await HeuristicScanner.scan(url, preloadedDom);
            
            if (result.status === "success") {
                DefaultParserUI.getContentCssInput().value = result.contentCss;
                DefaultParserUI.getChapterTitleCssInput().value = result.titleCss;
                statusSpan.textContent = "\u2705 Detection Successful";
                statusSpan.style.color = "green";
            } else if (result.status === "toc_detected") {
                statusSpan.textContent = "\u26A0\uFE0F Seems to be ToC. Please use the ToC flow.";
                statusSpan.style.color = "orange";
            } else {
                statusSpan.textContent = "\u274C Detection Failed. Please enter CSS manually.";
                statusSpan.style.color = "red";
            }
        } catch (err) {
            statusSpan.textContent = "\u274C Detection Failed. Please enter CSS manually.";
            statusSpan.style.color = "red";
        }
    }

    static setDefaultParserUiVisibility(isVisible) {
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