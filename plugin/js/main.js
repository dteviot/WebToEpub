/*
    Main processing handler for popup.html

*/
var main = (function() {
    "use strict";

    // this will be called when message listener fires
    function onMessageListener(message, sender, sendResponse) {  // eslint-disable-line no-unused-vars
        if (message.messageType == "ParseResults") {
            chrome.runtime.onMessage.removeListener(onMessageListener);
            util.log("addListener");
            util.log(message);
            // convert the string returned from content script back into a DOM
            let dom = new DOMParser().parseFromString(message.document, "text/html");
            populateControlsWithDom(message.url, dom);
        }
    }

    // details 
    let initialWebPage = null;
    let parser = null;
    let userPreferences = null;
    let library = new Library; 

    // register listener that is invoked when script injected into HTML sends its results
    function addMessageListener() {
        try {
            // note, this will throw if not running as an extension.
            if (!chrome.runtime.onMessage.hasListener(onMessageListener)) {
                chrome.runtime.onMessage.addListener(onMessageListener);
            }
        } catch (chromeError) {
            util.log(chromeError);
        }
    }

    // extract urls from DOM and populate control
    async function processInitialHtml(url, dom) {
        if (setParser(url, dom)) {
            try {
                userPreferences.addObserver(parser);
            } catch (error) {
                ErrorLog.showErrorMessage(error);
                return;
            }
            try {
                await parser.loadEpubMetaInfo(dom);
                let metaInfo = parser.getEpubMetaInfo(dom, userPreferences.useFullTitle.value);
                populateMetaInfo(metaInfo);
                setUiToDefaultState();
                parser.populateUI(dom);
            } catch (error) {
                ErrorLog.showErrorMessage(error);
            }
            try {
                await parser.onLoadFirstPage(url, dom);
            } catch (error) {
                ErrorLog.showErrorMessage(error);
            }
        }
    }

    function setUiToDefaultState() {
        document.getElementById("highestResolutionImagesRow").hidden = true;
        document.getElementById("unSuperScriptAlternateTranslations").hidden = true; 
        document.getElementById("imageSection").hidden = true;
        document.getElementById("outputSection").hidden = false;
        document.getElementById("translatorRow").hidden = true;
        document.getElementById("fileAuthorAsRow").hidden = true;
        document.getElementById("defaultParserSection").hidden = true;
    }

    function populateMetaInfo(metaInfo) {
        setUiFieldToValue("startingUrlInput", metaInfo.uuid);
        setUiFieldToValue("titleInput", metaInfo.title);
        setUiFieldToValue("authorInput", metaInfo.author);
        setUiFieldToValue("languageInput", metaInfo.language);
        setUiFieldToValue("fileNameInput", metaInfo.fileName);
        setUiFieldToValue("subjectInput", metaInfo.subject);
        setUiFieldToValue("descriptionInput", metaInfo.description);
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
            throw new Error(UIText.Error.unhandledFieldTypeError);
        }
    }

    function metaInfoFromControls() {
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = getValueFromUiField("startingUrlInput");
        metaInfo.title = getValueFromUiField("titleInput");
        metaInfo.author = getValueFromUiField("authorInput");
        metaInfo.language = getValueFromUiField("languageInput");
        metaInfo.fileName = getValueFromUiField("fileNameInput");
        metaInfo.subject = getValueFromUiField("subjectInput");
        metaInfo.description = getValueFromUiField("descriptionInput");

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
            throw new Error(UIText.Error.unhandledFieldTypeError);
        }
    }

    async function fetchContentAndPackEpub() {
        let libclick = this;
        if (document.getElementById("noAdditionalMetadataCheckbox").checked == true) {
            setUiFieldToValue("subjectInput", "");
            setUiFieldToValue("descriptionInput", "");
        }
        let metaInfo = metaInfoFromControls();

        if ("yes" == libclick.dataset.libclick) {
            if (document.getElementById("chaptersPageInChapterListCheckbox").checked) {
                ErrorLog.showErrorMessage(UIText.Error.errorAddToLibraryLibraryAddPageWithChapters);
                return;
            }
        }

        ChapterUrlsUI.limitNumOfChapterS(userPreferences.maxChaptersPerEpub.value);
        ChapterUrlsUI.resetDownloadStateImages();
        ErrorLog.clearHistory();
        window.workInProgress = true;
        main.getPackEpubButton().disabled = true;
        replaceLibAddToLibrary();
        parser.onStartCollecting();
        await parser.fetchContent().then(() => {
            return packEpub(metaInfo);
        }).then((content) => {
            // Enable button here.  If user cancels save dialog
            // the promise never returns
            window.workInProgress = false;
            main.getPackEpubButton().disabled = false;
            replaceLibAddToLibrary();
            let overwriteExisting = userPreferences.overwriteExistingEpub.value;
            let backgroundDownload = userPreferences.noDownloadPopup.value;
            let fileName = Download.CustomFilename();
            if ("yes" == libclick.dataset.libclick || util.sleepController.signal.aborted) {
                return library.LibAddToLibrary(content, fileName, document.getElementById("startingUrlInput").value, overwriteExisting, backgroundDownload);
            }
            return Download.save(content, fileName, overwriteExisting, backgroundDownload);
        }).then(() => {
            parser.updateReadingList();
            if (util.sleepController.signal.aborted) {
                util.sleepController = new AbortController;
                resetUI();
            }
            if (libclick.dataset.libsuppressErrorLog == true) {
                return;
            } else {
                ErrorLog.showLogToUser();
                dumpErrorLogToFile();
            }
        }).catch((err) => {
            window.workInProgress = false;
            main.getPackEpubButton().disabled = false;
            if (util.sleepController.signal.aborted) {
                util.sleepController = new AbortController;
            }
            replaceLibAddToLibrary();
            ErrorLog.showErrorMessage(err);
        });
    }

    function replaceLibAddToLibrary() {
        let el = document.getElementById("LibAddToLibrary");
        el.hidden = !el.hidden;
        el = document.getElementById("LibPauseToLibrary");
        el.hidden = !el.hidden;
    }

    function pauseToLibrary() {
        util.sleepController.abort();
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
        addMessageListener();
        injectContentScript(tabId);
    }

    function injectContentScript(tabId) {
        if (util.isFirefox()) {
            Firefox.injectContentScript(tabId);
        } else {
            chromeInjectContentScript(tabId);
        }
    }

    function chromeInjectContentScript(tabId) {
        try {
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                files: ["js/ContentScript.js"]
            });
        } catch {
            if (chrome.runtime.lastError) {
                util.log(chrome.runtime.lastError.message);
            }
        }
    }

    function populateControls() {
        loadUserPreferences();
        parserFactory.populateManualParserSelectionTag(getManuallySelectParserTag());
        configureForTabMode();
    }

    function loadUserPreferences() {
        userPreferences = UserPreferences.readFromLocalStorage();
        userPreferences.addObserver(library);
        userPreferences.writeToUi();
        userPreferences.hookupUi();
        BakaTsukiSeriesPageParser.registerBakaParsers(userPreferences.autoSelectBTSeriesPage.value);
    }

    function isRunningInTabMode() {
        // if query string supplied, we're running in Tab mode.
        let search = window.location.search;
        return !util.isNullOrEmpty(search);
    }

    async function populateControlsWithDom(url, dom) {
        initialWebPage = dom;
        setUiFieldToValue("startingUrlInput", url);

        // set the base tag, in case server did not supply it 
        util.setBaseTag(url, initialWebPage);
        await processInitialHtml(url, initialWebPage);
        if (document.getElementById("autosearchmetadataCheckbox").checked == true) {
            autosearchadditionalmetadata();
        }
    }

    function setParser(url, dom) {
        let manualSelect = getManuallySelectParserTag().value;
        if (util.isNullOrEmpty(manualSelect)) {
            parser = parserFactory.fetch(url, dom);
        } else {
            parser = parserFactory.manuallySelectParser(manualSelect);
        }
        if (parser === undefined) {
            ErrorLog.showErrorMessage(UIText.Error.noParserFound);
            return false;
        }
        getLoadAndAnalyseButton().hidden = true;
        let disabledMessage = parser.disabled();
        if (disabledMessage !== null) {
            ErrorLog.showErrorMessage(disabledMessage);
            return false;
        }
        return true;
    }

    // called when the "Diagnostics" check box is ticked or unticked
    function onDiagnosticsClick() {
        let enable = document.getElementById("diagnosticsCheckBoxInput").checked;
        document.getElementById("reloadButton").hidden = !enable;
    }

    function onAdvancedOptionsClick() {
        let section =  getAdvancedOptionsSection();
        section.hidden = !section.hidden;
        section = getAdditionalMetadataSection();
        section.hidden = !userPreferences.ShowMoreMetadataOptions.value;
        section =  getLibrarySection();
        section.hidden = true;
    }

    function onShowMoreMetadataOptionsClick() {
        let section = getAdditionalMetadataSection();
        section.hidden = !section.hidden;
    }

    function onLibraryClick() {
        let section =  getLibrarySection();
        section.hidden = !section.hidden;
        if (!section.hidden) {
            Library.LibRenderSavedEpubs();
        }
        section =  getAdvancedOptionsSection();
        section.hidden = true;
    }

    function onStylesheetToDefaultClick() {
        document.getElementById("stylesheetInput").value = EpubMetaInfo.getDefaultStyleSheet();
        userPreferences.readFromUi();
    }

    function openTabWindow() {
        // open new tab window, passing ID of open tab with content to convert to epub as query parameter.
        getActiveTab().then((tabId) => {
            let url = chrome.runtime.getURL("popup.html") + "?id=";
            url += tabId;
            try {
                chrome.tabs.create({ url: url, openerTabId: tabId });
            }
            catch (err) {
                //firefox android catch
                chrome.tabs.create({ url: url});
            }
            window.close();
        });
    }

    function getActiveTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                if ((tabs != null) && (0 < tabs.length)) {
                    resolve(tabs[0].id);
                } else {
                    reject();
                }
            });
        });
    }

    async function onLoadAndAnalyseButtonClick() {
        // load page via XmlHTTPRequest
        let url = getValueFromUiField("startingUrlInput");
        getLoadAndAnalyseButton().disabled = true;
        return HttpClient.wrapFetch(url).then(async (xhr) => {
            await populateControlsWithDom(url, xhr.responseXML);
            getLoadAndAnalyseButton().disabled = false;
        }).catch((error) => {
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
        initialWebPage = null;
        parser = null;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = "";
        populateMetaInfo(metaInfo);
        getLoadAndAnalyseButton().hidden = false;
        main.getPackEpubButton().disabled = false;
        document.getElementById("LibAddToLibrary").disabled = false;
        document.getElementById("LibAddToLibrary").hidden = false;
        document.getElementById("LibPauseToLibrary").hidden = true;
        ChapterUrlsUI.clearChapterUrlsTable();
        CoverImageUI.clearUI();
        ProgressBar.setValue(0);
        // Clear the selected value so it doesn't look like a parser is selected
        document.getElementById("manuallySelectParserTag").selectedIndex = -1;
    }

    function localizeHtmlPage() {
        // can't use a single select, because there are buttons in td elements
        for (let selector of ["button, option", "td, th", ".i18n"]) {
            for (let element of [...document.querySelectorAll(selector)]) {
                if (element.textContent.startsWith("__MSG_")) {
                    UIText.localizeElement(element);
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

    function getAdditionalMetadataSection() {
        return document.getElementById("AdditionalMetadatatable");
    }

    function getAdvancedOptionsSection() {
        return document.getElementById("advancedOptionsSection");
    }

    function getLibrarySection() {
        return document.getElementById("hiddenBibSection");
    }

    function onSeriesPageHelp() {
        chrome.tabs.create({ url: "https://github.com/dteviot/WebToEpub/wiki/FAQ#using-baka-tsuki-series-page-parser" });
    }

    function onCustomFilenameHelp() {
        chrome.tabs.create({ url: "https://github.com/dteviot/WebToEpub/wiki/Advanced-Options#custom-filename" });
    }

    function onDefaultParserHelp() {
        chrome.tabs.create({ url: "https://github.com/dteviot/WebToEpub/wiki/FAQ#how-to-convert-a-new-site-using-the-default-parser" });
    }

    function onReadOptionsFromFile(event) {
        userPreferences.readFromFile(event, populateControls);
    }

    function onReadingListCheckboxClicked() {
        let url = parser.state.chapterListUrl;
        let checked = UserPreferences.getReadingListCheckbox().checked;
        userPreferences.readingList.onReadingListCheckboxClicked(checked, url);
    }

    function sbFiltersShow()
    {
        sbShow();
        ChapterUrlsUI.Filters.init();
        document.getElementById("sbFilters").hidden = false;
        
        let filtersForm = document.getElementById("sbFiltersForm");
        util.removeElements(filtersForm.children);
        filtersForm.appendChild(ChapterUrlsUI.Filters.generateFiltersTable());
        ChapterUrlsUI.Filters.Filter(); //Run reset filters to clear confusion.
    }

    function sbShow() {
        document.getElementById("sbOptions").classList.add("sidebarOpen");
    }

    function sbHide() {
        document.getElementById("sbOptions").classList.remove("sidebarOpen");
        document.getElementById("sbFilters").hidden = true;
    }

    function showReadingList() {
        let sections = new Map(
            [...document.querySelectorAll("section")]
                .map(s =>[s, s.hidden])
        );
        [...sections.keys()].forEach(s => s.hidden = true);

        document.getElementById("readingListSection").hidden = false;
        document.getElementById("closeReadingList").onclick = () => {
            [...sections].forEach(s => s[0].hidden = s[1]);
        };

        let table = document.getElementById("readingListTable");
        userPreferences.readingList.showReadingList(table);
        table.onclick = (event) => userPreferences.readingList.onClickRemove(event);
    }

    /**
     * If work in progress, give user chance to cancel closing the window
     */
    function onUnloadEvent(event) {
        if (window.workInProgress === true) {
            event.preventDefault();
            event.returnValue = "";
        } else {
            delete event["returnValue"];
        }
    }

    function addEventHandlers() {
        getPackEpubButton().onclick = fetchContentAndPackEpub;
        document.getElementById("diagnosticsCheckBoxInput").onclick = onDiagnosticsClick;
        document.getElementById("reloadButton").onclick = populateControls;
        getManuallySelectParserTag().onchange = populateControls;
        document.getElementById("advancedOptionsButton").onclick = onAdvancedOptionsClick;
        document.getElementById("hiddenBibButton").onclick = onLibraryClick;
        document.getElementById("ShowMoreMetadataOptionsCheckbox").addEventListener("change", () => onShowMoreMetadataOptionsClick());
        document.getElementById("LibShowAdvancedOptionsCheckbox").addEventListener("change", () => Library.LibRenderSavedEpubs());
        document.getElementById("LibAddToLibrary").addEventListener("click", fetchContentAndPackEpub);
        document.getElementById("LibPauseToLibrary").addEventListener("click", pauseToLibrary);
        document.getElementById("stylesheetToDefaultButton").onclick = onStylesheetToDefaultClick;
        document.getElementById("resetButton").onclick = resetUI;
        document.getElementById("clearCoverImageUrlButton").onclick = clearCoverUrl;
        document.getElementById("seriesPageHelpButton").onclick = onSeriesPageHelp;
        document.getElementById("CustomFilenameHelpButton").onclick = onCustomFilenameHelp;
        document.getElementById("defaultParserHelpButton").onclick = onDefaultParserHelp;
        getLoadAndAnalyseButton().onclick = onLoadAndAnalyseButtonClick;
        document.getElementById("loadMetadataButton").onclick = onLoadMetadataButtonClick;

        document.getElementById("writeOptionsButton").onclick = () => userPreferences.writeToFile();
        document.getElementById("readOptionsInput").onchange = onReadOptionsFromFile;
        UserPreferences.getReadingListCheckbox().onclick = onReadingListCheckboxClicked;
        document.getElementById("viewFiltersButton").onclick = () => sbFiltersShow();
        document.getElementById("sbClose").onclick = () => sbHide();
        document.getElementById("viewReadingListButton").onclick = () => showReadingList();
        window.addEventListener("beforeunload", onUnloadEvent);
    }
	
	
    // Additional metadata
    function autosearchadditionalmetadata() {
        getPackEpubButton().disabled = true;
        document.getElementById("LibAddToLibrary").disabled = true;
        let titlename = getValueFromUiField("titleInput");
        let url ="https://www.novelupdates.com/series-finder/?sf=1&sh="+titlename;
        if (getValueFromUiField("subjectInput")==null) {
            autosearchnovelupdates(url, titlename);
        }   
        getPackEpubButton().disabled = false; 
        document.getElementById("LibAddToLibrary").disabled = false;    
    }
	
    function autosearchnovelupdates(url, titlename) {
        return HttpClient.wrapFetch(url).then((xhr) => {
            findnovelupdatesurl(url, xhr.responseXML, titlename);
        }).catch((error) => {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        });
    }

    function findnovelupdatesurl(url, dom, titlename) {
        try {    
            let searchurl = [...dom.querySelectorAll("a")].filter(a => a.textContent==titlename)[0];
            setUiFieldToValue("metadataUrlInput", searchurl.href);
            url = getValueFromUiField("metadataUrlInput");
            if (url.includes("novelupdates.com") == true) {
                onLoadMetadataButtonClick();
            }
        } catch {
            //
        }
    }
	
    function onLoadMetadataButtonClick() {
        getPackEpubButton().disabled = true;
        document.getElementById("LibAddToLibrary").disabled = true;
        let url = getValueFromUiField("metadataUrlInput");
        return HttpClient.wrapFetch(url).then((xhr) => {
            populateMetadataAddWithDom(url, xhr.responseXML);
        }).catch((error) => {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        });
    }

    function populateMetadataAddWithDom(url, dom) {
        try {
            let allTags = document.getElementById("lesstagsCheckbox").checked == false;
            let metaAddInfo = EpubMetaInfo.getEpubMetaAddInfo(dom, url, allTags);
            setUiFieldToValue("subjectInput", metaAddInfo.subject);
            setUiFieldToValue("descriptionInput", metaAddInfo.description);
            if (getValueFromUiField("authorInput")=="<unknown>") {
                setUiFieldToValue("authorInput", metaAddInfo.author);
            }
            getPackEpubButton().disabled = false;
            document.getElementById("LibAddToLibrary").disabled = false;
        } catch (error) {
            ErrorLog.showErrorMessage(error);
            getPackEpubButton().disabled = false;
            document.getElementById("LibAddToLibrary").disabled = false;
        }
    }

    // actions to do when window opened
    window.onload = () => {
        userPreferences = UserPreferences.readFromLocalStorage();
        if (isRunningInTabMode()) { 
            ErrorLog.SuppressErrorLog =  false;
            localizeHtmlPage();
            getAdvancedOptionsSection().hidden = !userPreferences.advancedOptionsVisibleByDefault.value;
            getAdditionalMetadataSection().hidden = !userPreferences.ShowMoreMetadataOptions.value;
            addEventHandlers();
            populateControls();
            if (util.isFirefox()) {
                Firefox.startWebRequestListeners();
            }
        } else {
            openTabWindow();
        }
    };

    return {
        getPackEpubButton: getPackEpubButton,
        onLoadAndAnalyseButtonClick : onLoadAndAnalyseButtonClick,
        fetchContentAndPackEpub: fetchContentAndPackEpub,
        resetUI: resetUI,
        getUserPreferences: () => userPreferences,
    };
})();

