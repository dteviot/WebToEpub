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

    saveSiteConfig(hostname, contentCss, titleCss, removeCss, testUrl, nextPageCss) {
        if (this.isConfigChanged(hostname, contentCss, titleCss, removeCss, testUrl, nextPageCss)) {
            this.configs.set(
                hostname, {
                    contentCss: contentCss,
                    titleCss: titleCss,
                    removeCss: removeCss,
                    testUrl: testUrl,
                    nextPageCss: nextPageCss
                }
            );
            let serialized = JSON.stringify(Array.from(this.configs.entries()));
            window.localStorage.setItem(DefaultParserSiteSettings.storageName, serialized);
        }
    }

    /** @private */
    isConfigChanged(hostname, contentCss, titleCss, removeCss, testUrl, nextPageCss) {
        let config = this.configs.get(hostname);
        return (config === undefined) ||
            (contentCss !== config.contentCss) ||
            (titleCss !== config.titleCss) ||
            (removeCss !== config.removeCss) ||
            (testUrl !== config.testUrl) ||
            (nextPageCss !== config.nextPageCss);
    }

    getConfigForSite(hostname) {
        return this.configs.get(hostname);
    }

    constructFindContentLogicForSite(hostname) {
        let logic = {
            findContent: dom => dom.querySelector("body"),
            findChapterTitle: () => null,
            removeUnwanted: () => null,
            findNextPageUrl: () => null
        };
        let config = this.getConfigForSite(hostname);
        if (config != null) {
            logic.findContent = dom => dom.querySelector(config.contentCss);
            if (!util.isNullOrEmpty(config.titleCss)) {
                logic.findChapterTitle = dom => dom.querySelector(config.titleCss);
            }
            if (!util.isNullOrEmpty(config.removeCss)) {
                logic.removeUnwanted = (element) => {
                    for (let e of element.querySelectorAll(config.removeCss)) {
                        e.remove();
                    }
                };
            }
            if (!util.isNullOrEmpty(config.nextPageCss)) {
                logic.findNextPageUrl = (dom, currentUrl) => {
                    let nextLnk = dom.querySelector(config.nextPageCss);
                    return nextLnk ? util.resolveRelativeUrl(currentUrl, nextLnk.getAttribute("href") || "") : null;
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
        document.getElementById("autocompleteWithAiButton").onclick = DefaultParserUI.autocompleteWithAi.bind(null, parser);
        document.getElementById("finisheddefaultParserButton").onclick = DefaultParserUI.onFinishedClicked.bind(null, parser);
    }

    static async autocompleteWithAi(parser) {
        let testUrlInput = DefaultParserUI.getTestChapterUrlInput();
        let startingUrlInput = document.getElementById("startingUrlInput");
        let testUrl = testUrlInput.value.trim();
        let startingUrl = startingUrlInput ? startingUrlInput.value.trim() : "";

        try {
            document.getElementById("autocompleteWithAiButton").disabled = true;
            document.getElementById("autocompleteWithAiButton").textContent = "...";

            // Force proxy for manual configuration if not in a standard extension context
            if (typeof chrome === "undefined" || !chrome.runtime?.id || window.location.protocol === "file:") {
                HttpClient.enableCorsProxy = true;
                HttpClient.updateCorsProxyUi();
            }

            // Phase 1: If Test Chapter URL is missing, detect it from TOC (Starting URL)
            if (util.isNullOrEmpty(testUrl)) {
                if (util.isNullOrEmpty(startingUrl)) {
                    alert("Please provide a 'Starting URL' or a 'Test Chapter URL' so AI can investigate.");
                    return;
                }
                console.log(`[DefaultParserUI] Phase 1: Searching TOC for first chapter: ${startingUrl}`);
                let xhr = await HttpClient.wrapFetch(startingUrl);
                let tocHtml = xhr.responseText || (xhr.responseXML ? xhr.responseXML.documentElement.outerHTML : "");

                if (util.isNullOrEmpty(tocHtml)) {
                    throw new Error("Failed to fetch TOC page. Check your connection or proxy.");
                }

                let tocInfo = await AiClient.fetchAiFirstChapter(tocHtml, startingUrl);
                if (tocInfo && tocInfo.firstChapterUrl) {
                    testUrl = tocInfo.firstChapterUrl;
                    testUrlInput.value = testUrl;
                    console.log(`[DefaultParserUI] Phase 1 Success. First chapter detected: ${testUrl}`);

                    // Autofill Novel Title / Author if available
                    if (tocInfo.novelTitle && !document.getElementById("titleInput").value) {
                        document.getElementById("titleInput").value = tocInfo.novelTitle;
                    }
                    if (tocInfo.author && !document.getElementById("authorInput").value) {
                        document.getElementById("authorInput").value = tocInfo.author;
                    }
                    if (tocInfo.nextPageCss) {
                        let nextInput = DefaultParserUI.getNextPageCssInput();
                        if (nextInput) nextInput.value = tocInfo.nextPageCss;
                    }
                } else {
                    throw new Error("AI could not find the first chapter link from the TOC. Please input it manually.");
                }
            }

            // Phase 2: Analyze the chapter page for content selectors
            console.log(`[DefaultParserUI] Phase 2: Analyzing chapter page: ${testUrl}`);
            let xhr = await HttpClient.wrapFetch(testUrl);
            let html = xhr.responseText || (xhr.responseXML ? xhr.responseXML.documentElement.outerHTML : "");

            if (util.isNullOrEmpty(html) || html.length < 100) {
                throw new Error("Failed to fetch chapter HTML. Please check your proxy settings and URL.");
            }

            let selectors = await AiClient.fetchAiSelectors(html, testUrl);
            if (selectors) {
                console.log("[DefaultParserUI] AI predicted selectors:", selectors);
                if (selectors.content) DefaultParserUI.getContentCssInput().value = selectors.content;
                if (selectors.title) DefaultParserUI.getChapterTitleCssInput().value = selectors.title;
                if (selectors.remove) DefaultParserUI.getUnwantedElementsCssInput().value = selectors.remove;

                // Immediately test to show result
                await DefaultParserUI.testDefaultParser(parser);
            } else {
                alert("AI failed to predict selectors for this chapter page.");
            }
        } catch (err) {
            console.error("[DefaultParserUI] Autocomplete failed:", err);
            ErrorLog.showErrorMessage(err);
        } finally {
            document.getElementById("autocompleteWithAiButton").disabled = false;
            let label = "Autocomplete with AI";
            try { label = chrome.i18n.getMessage("__MSG_button_autocomplete_with_ai__") || label; } catch (e) { /* fallback */ }
            document.getElementById("autocompleteWithAiButton").textContent = label;
        }
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
        let nextInput = DefaultParserUI.getNextPageCssInput();
        let nextPageCss = nextInput ? nextInput.value.trim() : "";

        parser.siteConfigs.saveSiteConfig(hostname, contentCss, titleCss, removeCss, testUrl, nextPageCss);
    }

    static populateDefaultParserUI(hostname, parser) {
        DefaultParserUI.getDefaultParserHostnameInput().value = hostname;

        DefaultParserUI.getContentCssInput().value = "body";
        DefaultParserUI.getChapterTitleCssInput().value = "";
        DefaultParserUI.getUnwantedElementsCssInput().value = "";
        DefaultParserUI.getTestChapterUrlInput().value = "";
        let nextInput = DefaultParserUI.getNextPageCssInput();
        if (nextInput) nextInput.value = "";

        let config = parser.siteConfigs.getConfigForSite(hostname);
        if (config != null) {
            DefaultParserUI.getContentCssInput().value = config.contentCss;
            DefaultParserUI.getChapterTitleCssInput().value = config.titleCss;
            DefaultParserUI.getUnwantedElementsCssInput().value = config.removeCss;
            DefaultParserUI.getTestChapterUrlInput().value = config.testUrl;
            if (nextInput && config.nextPageCss) {
                nextInput.value = config.nextPageCss;
            }
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
        if (util.isNullOrEmpty(config.testUrl)) {
            alert(UIText.Warning.warningNoChapterUrl);
            return;
        }
        try {
            // Force proxy for manual configuration if not in a standard extension context
            if (typeof chrome === "undefined" || !chrome.runtime?.id || window.location.protocol === "file:") {
                HttpClient.enableCorsProxy = true;
                HttpClient.updateCorsProxyUi();
            }

            let xhr = await HttpClient.wrapFetch(config.testUrl);
            if (!xhr.responseXML) {
                // If XML is not available, try to parse the text
                let html = xhr.responseText || "";
                if (html) {
                    xhr.responseXML = new DOMParser().parseFromString(html, "text/html");
                }
            }

            if (!xhr.responseXML) {
                throw new Error("Failed to parse the test page. The response may be empty or invalid.");
            }

            let dom = xhr.responseXML;
            if (!dom || !dom.documentElement) {
                dom = new DOMParser().parseFromString(xhr.responseText || "", "text/html");
            }

            let webPage = { rawDom: dom };
            let content = parser.findContent(webPage.rawDom);
            if (content === null) {
                console.error("[DefaultParserUI] Content not found for selector:", config.contentCss);
                console.error("[DefaultParserUI] HTML length:", webPage.rawDom.documentElement.outerHTML.length);
                console.error("[DefaultParserUI] HTML Snapshot (first 3000 chars):", webPage.rawDom.documentElement.outerHTML.substring(0, 3000));
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

    static getNextPageCssInput() {
        return document.getElementById("defaultParserNextPageCss");
    }
}

