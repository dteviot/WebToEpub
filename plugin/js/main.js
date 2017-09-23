/*
    Main processing handler for popup.html

*/
var main = (function () {
    "use strict";

    // this will be called when message listener fires
    function onMessageListener(message) {
        // convert the string returned from content script back into a DOM
        let dom = new DOMParser().parseFromString(message.document, "text/html");
        populateControlsWithDom(message.url, dom);
    };

    // details 
    let initalWebPage = null;
    let parser = null;
    let userPreferences = null;

    // register listener that is invoked when script injected into HTML sends its results
    try {
        // note, this will throw if not running as an extension.
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {   // eslint-disable-line no-unused-vars
            if (request.messageType == "ParseResults") {
                util.log("addListener");
                util.log(request);
                onMessageListener(request);
            }
        });
    }
    catch (chromeError)
    {
        util.log(chromeError);
    }

    // extract urls from DOM and populate control
    function processInitialHtml(url, dom) {
        if (setParser(url, dom)) {
            try {
                userPreferences.addObserver(parser);
                let metaInfo = parser.getEpubMetaInfo(dom);
                populateMetaInfo(metaInfo);
                parser.populateUI(dom);
                parser.onLoadFirstPage(url, dom);
            } catch (error) {
                ErrorLog.showErrorMessage(error);
            }
        }
    }

    function populateMetaInfo(metaInfo) {
        setUiFieldToValue("startingUrlInput", metaInfo.uuid);
        setUiFieldToValue("titleInput", metaInfo.title);
        setUiFieldToValue("authorInput", metaInfo.author);
        setUiFieldToValue("languageInput", metaInfo.language);
        setUiFieldToValue("fileNameInput", metaInfo.fileName);

        if (metaInfo.seriesName !== null) {
            document.getElementById("seriesRow").hidden = false;
            document.getElementById("volumeRow").hidden = false;
            setUiFieldToValue("seriesNameInput", metaInfo.seriesName);
            setUiFieldToValue("seriesIndexInput", metaInfo.seriesIndex);
        }

        setUiFieldToValue("translatorInput", metaInfo.translator);
        setUiFieldToValue("fileAuthorAsInput", metaInfo.fileAuthorAs);
    }

    function setUiFieldToValue(elementId, value) {
        let element = document.getElementById(elementId);
        if (util.isTextInputField(element) || util.isTextAreaField(element)) {
            element.value = (value == null) ? "" : value;
        } else {
            throw new Error(chrome.i18n.getMessage("unhandledFieldTypeError"));
        }
    }

    function metaInfoFromControls() {
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = getValueFromUiField("startingUrlInput");
        metaInfo.title = getValueFromUiField("titleInput");
        metaInfo.author = getValueFromUiField("authorInput");
        metaInfo.language = getValueFromUiField("languageInput");
        metaInfo.fileName = getValueFromUiField("fileNameInput");

        if (document.getElementById("seriesRow").hidden === false) {
            metaInfo.seriesName = getValueFromUiField("seriesNameInput");
            metaInfo.seriesIndex = getValueFromUiField("seriesIndexInput");
        }

        metaInfo.translator = getValueFromUiField("translatorInput");
        metaInfo.fileAuthorAs = getValueFromUiField("fileAuthorAsInput");
        metaInfo.styleSheet = userPreferences.styleSheet.value;

        return metaInfo;
    }

    function getValueFromUiField(elementId) {
        let element = document.getElementById(elementId);
        if (util.isTextInputField(element) || util.isTextAreaField(element)) {
            return (element.value === "") ? null : element.value;
        } else {
            throw new Error(chrome.i18n.getMessage("unhandledFieldTypeError"));
        }
    }

    function fetchContentAndPackEpub() {
        let metaInfo = metaInfoFromControls();
        let fileName = EpubPacker.addExtensionIfMissing(metaInfo.fileName);

        if (Download.isFileNameIllegalOnWindows(fileName)) {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorIllegalFileName",
                [fileName, Download.illegalWindowsFileNameChars]
            ));
            return;
        }

        ErrorLog.clearHistory();
        main.getPackEpubButton().disabled = true;
        parser.onStartCollecting();
        parser.fetchContent().then(function () {
            return packEpub(metaInfo);
        }).then(function (content) {
            return Download.save(content, fileName);
        }).then(function () {
            ErrorLog.showLogToUser();
            return dumpErrorLogToFile();
        }).catch(function (err) {
            ErrorLog.showErrorMessage(err);
        });
    }

    function epubVersionFromPreferences() {
        return userPreferences.createEpub3.value ? 
            EpubPacker.EPUB_VERSION_3 : EpubPacker.EPUB_VERSION_2;
    }

    function packEpub(metaInfo) {
        let epubVersion = epubVersionFromPreferences();
        let epub = new EpubPacker(metaInfo, epubVersion);
        return epub.assemble(parser.epubItemSupplier());
    }

    function dumpErrorLogToFile() {
        let errors = ErrorLog.dumpHistory();
        if (userPreferences.writeErrorHistoryToFile.value &&
            !util.isNullOrEmpty(errors)) {
            let fileName = metaInfoFromControls().fileName + ".ErrorLog.txt";
            let blob = new Blob([errors], {type : "text"});
            return Download.save(blob, fileName)
                .catch (err => ErrorLog.showErrorMessage(err));
        }
    }

    function getActiveTabDOM(tabId) {
        chrome.tabs.executeScript(tabId, { file: "js/ContentScript.js", runAt: "document_end" },
            function (result) {   // eslint-disable-line no-unused-vars
                if (chrome.runtime.lastError) {
                    util.log(chrome.runtime.lastError.message);
                };
            }
        );
    }

    function populateControls() {
        loadUserPreferences();
        parserFactory.populateManualParserSelectionTag(getManuallySelectParserTag());
        if (isRunningInTabMode()) {
            configureForTabMode();
        } else if (isRunningFromWebPageOrLocalFile()) {
            // nothing to do, user will need to supply URL
        } else {
            // running as an extention, try get active tab
            getActiveTabDOM();
        }
    }

    function loadUserPreferences() {
        userPreferences = UserPreferences.readFromLocalStorage();
        userPreferences.writeToUi();
        userPreferences.hookupUi();
    }

    function isRunningFromWebPageOrLocalFile() {
        let protocol = window.location.protocol;
        return (protocol.startsWith("http") || protocol.startsWith("file"));
    }

    function isRunningInTabMode() {
        // if query string supplied, we're running in Tab mode.
        let search = window.location.search;
        return !util.isNullOrEmpty(search);
    }

    function populateControlsWithDom(url, dom) {
        initalWebPage = dom;
        setUiFieldToValue("startingUrlInput", url);

        // set the base tag, in case server did not supply it 
        util.setBaseTag(url, initalWebPage);
        processInitialHtml(url, initalWebPage);
    }

    function setParser(url, dom) {
        let manualSelect = getManuallySelectParserTag().value;
        if (util.isNullOrEmpty(manualSelect)) {
            parser = parserFactory.fetch(url, dom);
        } else {
            parser = parserFactory.manuallySelectParser(manualSelect);
        }
        if (parser === undefined) {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("noParserFound"));
            return false;
        }
        getLoadAndAnalyseButton().hidden = true;
        return true;
    }

    // called when the "Diagnostics" check box is ticked or unticked
    function onDiagnosticsClick() {
        let enable = document.getElementById("diagnosticsCheckBoxInput").checked;
        document.getElementById("reloadButton").hidden = !enable;
        document.getElementById("packRawButton").hidden = !enable;
        document.getElementById("fetchChaptersButton").hidden = !enable;
        document.getElementById("fetchImagesButton").hidden = !enable;
    }

    function onAdvancedOptionsClick() {
        let section =  getAdvancedOptionsSection();
        section.hidden = !section.hidden;
    }

    function onStylesheetToDefaultClick() {
        document.getElementById("stylesheetInput").value = EpubMetaInfo.getDefaultStyleSheet();
        userPreferences.readFromUi();
    }

    function openTabWindow() {
        // open new tab window, passing ID of open tab with content to convert to epub as query parameter.
        getActiveTab().then(function (tabId) {
            let url = chrome.extension.getURL("popup.html") + "?id=";
            url += tabId;
            chrome.tabs.create({ url: url });
            window.close();
        });
    }

    function getActiveTab() {
        return new Promise(function (resolve, reject) {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                if ((tabs != null) && (0 < tabs.length)) {
                    resolve(tabs[0].id);
                } else {
                    reject();
                };
            });
        });
    }

    function onLoadAndAnalyseButtonClick() {
        // load page via XmlHTTPRequest
        let url = getValueFromUiField("startingUrlInput");
        getLoadAndAnalyseButton().disabled = true;
        return HttpClient.wrapFetch(url).then(function (xhr) {
            populateControlsWithDom(url, xhr.responseXML);
            getLoadAndAnalyseButton().disabled = false;
        }).catch(function (error) {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        });
    }

    function configureForTabMode() {
        getActiveTabDOM(extractTabIdFromQueryParameter());
    }

    function extractTabIdFromQueryParameter() {
        let windowId = window.location.search.split("=")[1];
        if (!util.isNullOrEmpty(windowId)) {
            return parseInt(windowId, 10);
        }
    }

    function getPackEpubButton() {
        return document.getElementById("packEpubButton");
    }

    function getLoadAndAnalyseButton() {
        return document.getElementById("loadAndAnalyseButton");
    }

    function resetUI() {
        initalWebPage = null;
        parser = null;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = "";
        populateMetaInfo(metaInfo);
        getLoadAndAnalyseButton().hidden = false;
        main.getPackEpubButton().disabled = false;
        ChapterUrlsUI.clearChapterUrlsTable();
        CoverImageUI.clearUI();
        document.getElementById("fetchProgress").value = 0;
    }

    function localize(element) {
        let localized = chrome.i18n.getMessage(element.innerText);
        if (!util.isNullOrEmpty(localized)) {
            element.innerText = localized;
        };
    }

    function localizeHtmlPage()
    {
        // can't use a single select, because there are buttons in td elements
        for(let selector of ["button, option", "td, th"]) {
            for(let element of [...document.querySelectorAll(selector)]) {
                if (element.textContent.startsWith("__MSG_")) {
                    localize(element);
                }
            }
        }
    }

    function clearCoverUrl() {
        CoverImageUI.setCoverImageUrl(null);
    }

    function getManuallySelectParserTag() {
        return document.getElementById("manuallySelectParserTag");
    }

    function getAdvancedOptionsSection() {
        return document.getElementById("advancedOptionsSection");
    }

    function addOnClickEventHandlers() {
        getPackEpubButton().onclick = fetchContentAndPackEpub;
        document.getElementById("diagnosticsCheckBoxInput").onclick = onDiagnosticsClick;
        document.getElementById("reloadButton").onclick = populateControls;
        getManuallySelectParserTag().onchange = populateControls;
        document.getElementById("advancedOptionsButton").onclick = onAdvancedOptionsClick;
        document.getElementById("stylesheetToDefaultButton").onclick = onStylesheetToDefaultClick;
        document.getElementById("resetButton").onclick = resetUI;
        document.getElementById("clearCoverImageUrlButton").onclick = clearCoverUrl;
        getLoadAndAnalyseButton().onclick = onLoadAndAnalyseButtonClick;
    }

    // actions to do when window opened
    window.onload = function () {
        userPreferences = UserPreferences.readFromLocalStorage();
        if (isRunningInTabMode() || !userPreferences.alwaysOpenAsTab.value) {
            localizeHtmlPage();
            getAdvancedOptionsSection().hidden = !userPreferences.advancedOptionsVisibleByDefault.value;
            addOnClickEventHandlers();
            populateControls();
        } else {
            openTabWindow();
        }
    }

    return {
        getPackEpubButton: getPackEpubButton
    };
})();

