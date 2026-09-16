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
            populateControlsWithDom(message.url, dom).catch(e => ErrorLog.showErrorMessage(e));
        }
    }

    // details 
    let initialWebPage = null;
    let initialMetaInfo = null;
    let parser = null;
    let userPreferences = null;
    let library = new Library;
    // Captures the user's explicit mode choice at the instant of a physical
    // radio click. Consumed (and cleared) by routeCrawlerMode on the next Load,
    // bypassing HeuristicScanner entirely. null = no explicit choice this cycle.
    let explicitUserMode = null;

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
                initialMetaInfo = metaInfo;
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
        setUiFieldToValue("publisherInput", metaInfo.publisher);
        setUiFieldToValue("datePublishedInput", metaInfo.datePublished);
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
        metaInfo.publisher = getValueFromUiField("publisherInput");
        metaInfo.datePublished = getValueFromUiField("datePublishedInput");

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
        util.resetSleepController();
        let libclick = this;
        let metaInfo = metaInfoFromControls();
        if (document.getElementById("noAdditionalMetadataCheckbox").checked == true
            && initialMetaInfo != null) {
            metaInfo.subject = initialMetaInfo.subject;
            metaInfo.description = initialMetaInfo.description;
            metaInfo.publisher = initialMetaInfo.publisher;
        }

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
        try {
            parser.onStartCollecting();
            await parser.fetchContent();
            let content = await packEpub(metaInfo);
            // Enable button here.  If user cancels save dialog
            // the promise never returns
            window.workInProgress = false;
            main.getPackEpubButton().disabled = false;
            replaceLibAddToLibrary();
            let overwriteExisting = userPreferences.overwriteExistingEpub.value;
            let backgroundDownload = userPreferences.noDownloadPopup.value;
            let fileName = Download.CustomFilename();
            if ("yes" == libclick.dataset.libclick || util.getSleepController().signal.aborted) {
                await library.LibAddToLibrary(content, fileName, document.getElementById("startingUrlInput").value, overwriteExisting, backgroundDownload);
            } else {
                await Download.save(content, fileName, overwriteExisting, backgroundDownload);
            }
            parser.updateReadingList();
            if (util.getSleepController().signal.aborted) {
                util.resetSleepController();
                resetUI();
            }
            if (libclick.dataset.libsuppressErrorLog == true) {
                return;
            } else {
                ErrorLog.showLogToUser();
                dumpErrorLogToFile();
            }
        } catch (err) {
            window.workInProgress = false;
            main.getPackEpubButton().disabled = false;
            if (util.getSleepController().signal.aborted) {
                util.resetSleepController();
            }
            replaceLibAddToLibrary();
            ErrorLog.showErrorMessage(err);
        }
    }

    function replaceLibAddToLibrary() {
        let el = document.getElementById("LibAddToLibrary");
        el.hidden = !el.hidden;
        el = document.getElementById("LibPauseToLibrary");
        el.hidden = !el.hidden;
    }

    function pauseToLibrary() {
        util.getSleepController().abort();
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

    // Apply the crawler mode UI toggle (chain vs table of contents) based on the
    // given selection, independent of handler initialization order.
    function applyCrawlerModeUI(isChain) {
        document.getElementById("nextPageSelectorContainer").style.display = isChain ? "inline-flex" : "none";
        let loadBtn = document.getElementById("loadAndAnalyseButton");
        if (loadBtn) loadBtn.hidden = isChain;

        // Toggle batch-action controls (First/Last Chapter, Chapter Count, Select All, etc.)
        let batchControls = document.getElementById("batchActionControls");
        if (batchControls) {
            batchControls.style.display = isChain ? "none" : "block";
        }

        // Toggle the "No ToC" guiding notice and re-trigger its shake animation.
        let noticeBox = document.getElementById("noTocNotice");
        if (noticeBox) {
            if (isChain) {
                noticeBox.style.display = "block";
                // Re-trigger CSS animation
                noticeBox.classList.remove("shake-anim");
                void noticeBox.offsetWidth; // Trigger DOM reflow
                noticeBox.classList.add("shake-anim");
            } else {
                noticeBox.style.display = "none";
            }
        }
    }

    // Smart pre-routing: run HeuristicScanner on the freshly loaded DOM. If the
    // scan confirms chapter content, switch to No-ToC (Chain) mode; otherwise
    // (ToC detected, scan failed, or no result) default to native WTE behaviour
    // (Has ToC) and let the original pipeline handle selector configuration.
    async function routeCrawlerMode(url, dom) {
        // 1. If the user clicked a mode radio since the last Load, apply their
        //    choice and short-circuit — the probe must never override a
        //    genuine user action.
        if (explicitUserMode) {
            const modeToSet = explicitUserMode === "chain" ? "modeChain" : "modeToc";
            document.getElementById(modeToSet).checked = true;
            explicitUserMode = null; // consume the signal (fire-once)
            return;
        }

        // 2. No explicit user intervention this cycle — run the probe normally.
        let scanResult = await HeuristicScanner.scan(url, dom);
        if (scanResult.status === "success") {
            document.getElementById("modeChain").checked = true;
        } else {
            document.getElementById("modeToc").checked = true;
        }
    }

    async function populateControlsWithDom(url, dom) {
        initialWebPage = dom;

        // Seed the starting-URL input with the fetched/active-tab URL so the rest
        // of the pipeline (setBaseTag / processInitialHtml) has a canonical seed.
        // NOTE: routeCrawlerMode below deliberately does NOT touch
        // #startingUrlInput, so the user's current input is never clobbered by
        // routing — it only switches the mode radio and shows soft warnings.
        setUiFieldToValue("startingUrlInput", url);

        // Set the base tag BEFORE routeCrawlerMode so HeuristicScanner derives
        // pageOrigin from the correct doc.baseURI. Parsed DOMs (active-tab
        // path) otherwise default to the popup's chrome-extension URL, making
        // every link appear cross-origin and falsely flipping the mode to
        // No-ToC.
        util.setBaseTag(url, initialWebPage);

        // --- Smart Pre-routing via HeuristicScanner (extracted) ---
        // One chokepoint so every entry point (Load button, active-tab
        // listener, openTab) re-triggers smart routing without a redundant
        // scan at each call site.
        await routeCrawlerMode(url, dom);

        // Apply the crawler mode UI switch to mirror the currently selected radio,
        // so the UI never desyncs from the user's (or auto-routed) mode choice.
        applyCrawlerModeUI(document.getElementById("modeChain").checked);

        let currentStartingUrl = getValueFromUiField("startingUrlInput");
        let isChain = document.getElementById("modeChain").checked;
        
        // Only proceed if a ToC URL exists or Chain Mode is active
        if (currentStartingUrl || isChain) {
            let targetUrl = isChain ? url : currentStartingUrl;
            await processInitialHtml(targetUrl, initialWebPage);
        }

        if (document.getElementById("autosearchmetadataCheckbox").checked == true) {
            await autosearchadditionalmetadata();
        }
    }

    function setParser(url, dom) {
        /* This didn't work as firefox on tablets behaves differently than frefox on smartphones.
        if (/Android|Mobile/i.test(navigator.userAgent)) {
            ErrorLog.showErrorMessage(UIText.Error.errorMobileModeDetected);
            return false;
        } */
        
        // --- ADDED: Crawler mode routing ---
        let isChainCrawler = document.getElementById("modeChain")?.checked;

        if (isChainCrawler) {
            parser = new NoTocChainParser(new ImageCollector());
        } else {
            let manualSelect = getManuallySelectParserTag().value;
            if (util.isNullOrEmpty(manualSelect)) {
                parser = parserFactory.fetch(url, dom);
            } else {
                parser = parserFactory.manuallySelectParser(manualSelect);
            }
        }
        // -----------------------------------

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

    async function openTabWindow() {
        // open new tab window, passing ID of open tab with content to convert to epub as query parameter.
        let tabId = await getActiveTab();
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
        try {
            let xhr = await HttpClient.wrapFetch(url);
            let dom = xhr.responseXML;
            // Pass the POST-REDIRECT url (the one actually served), not the
            // user-typed url: HttpClient resolves relative links against
            // doc.baseURI = response.url, so populateControlsWithDom/setBaseTag
            // must use the same source or <base href> resolution diverges.
            await populateControlsWithDom(xhr.response.url, dom);
            getLoadAndAnalyseButton().disabled = false;
        } catch (error) {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        }
    }

    /**
     * Option B — Chain Mode auto-resume probe.
     *
     * For a Chain library update the seed is the book's FIRST chapter, so the
     * normal flow would re-crawl from ch.1 and stall. This probe resumes
     * forward without touching isIncludeable or the crawl loop:
     *   1. Read the last downloaded chapter URL from the epub manifest
     *      (Library.LibGetSourceChapterList), falling back to the reading list.
     *   2. Headlessly fetch that last chapter's DOM.
     *   3. Reuse NoTocChainParser.extractNextChapterUrlFromDom to find N+1.
     *   4. Re-seed by re-running onLoadAndAnalyseButtonClick on N+1 (never
     *      downloaded, so it bypasses the isIncludeable filter), then restore
     *      #startingUrlInput to the original seed so LibAddToLibrary merges.
     *
     * Returns "skipped" (not a chain book / no history), "resumed" (re-seeded
     * to N+1), "uptodate" (no N+1 link), or "probeFailed" (re-analyse did not
     * rebuild a crawlable state). Native Has-ToC updates return "skipped"
     * immediately.
     */
    async function maybeProbeChainResume(seedUrl) {
        // Only intercept Chain (No-ToC) updates. Native Has-ToC parsers never
        // match this guard, so their update path is left completely untouched.
        if (!(parser instanceof NoTocChainParser)) {
            return "skipped";
        }
        if (util.isNullOrEmpty(seedUrl)) {
            return "skipped";
        }

        // 1. Locate the last downloaded chapter (the index pointer). The epub
        //    manifest is authoritative and ordered; the reading list is a fast
        //    lightweight fallback.
        let lastChapterUrl = null;
        try {
            let sourceList = await Library.LibGetSourceChapterList(seedUrl);
            if (sourceList && sourceList.length > 0) {
                // Take the last non-empty source URL (data-URI chapters yield "").
                for (let i = sourceList.length - 1; i >= 0; i--) {
                    if (!util.isNullOrEmpty(sourceList[i])) {
                        lastChapterUrl = sourceList[i];
                        break;
                    }
                }
            }
        } catch (e) {
            lastChapterUrl = null;
        }
        if (util.isNullOrEmpty(lastChapterUrl) && userPreferences && userPreferences.readingList) {
            lastChapterUrl = userPreferences.readingList.getEpub(seedUrl);
        }

        // No history to resume from (first-ever download, or unreadable epub):
        // let the normal flow crawl from the original seed.
        if (util.isNullOrEmpty(lastChapterUrl)) {
            return "skipped";
        }

        // 2. Single headless fetch of the last downloaded chapter's DOM.
        let probeDom = null;
        try {
            let xhr = await HttpClient.wrapFetch(lastChapterUrl);
            probeDom = xhr ? xhr.responseXML : null;
        } catch (e) {
            // Probe failed (network/CAPTCHA/removed page). Degrade gracefully:
            // fall back to the normal crawl-from-seed flow rather than aborting.
            return "skipped";
        }
        if (!probeDom) {
            return "skipped";
        }

        // 3. Reuse the seed parser's sniffer config (it already populated
        //    #nextPageCssInput and dynamicFallbackSelector during getChapterUrls)
        //    to resolve chapter N+1 from the last chapter's DOM.
        let nextUrl = parser.extractNextChapterUrlFromDom(probeDom);

        // No "next" link on the last downloaded chapter => book is up to date.
        if (util.isNullOrEmpty(nextUrl)) {
            ErrorLog.showErrorMessage(
                "ℹ️ Already up to date — no new chapters found after the last downloaded chapter.\n" +
                "(Last chapter: " + lastChapterUrl + ")"
            );
            return "uptodate";
        }
        // Guard against a self-referencing "next" link (some sites point the
        // last chapter's next button back to itself).
        try {
            if (util.normalizeUrlForCompare(nextUrl) === util.normalizeUrlForCompare(lastChapterUrl)) {
                ErrorLog.showErrorMessage(
                    "ℹ️ Already up to date — the last downloaded chapter has no forward next link.\n" +
                    "(Last chapter: " + lastChapterUrl + ")"
                );
                return "uptodate";
            }
        } catch (e) {
            // normalizeUrlForCompare may throw on malformed URLs; treat the
            // resolved nextUrl as valid and let the crawl decide.
        }
        // 4. Re-seed: load N+1 as if the user pasted it, so smart-routing +
        //    the chain crawler take over from a never-downloaded page (bypasses
        //    isIncludeable). Then restore #startingUrlInput to the canonical
        //    seed so LibAddToLibrary merges into the existing book.
        let preProbeParser = parser;
        setUiFieldToValue("startingUrlInput", nextUrl);
        // onLoadAndAnalyseButtonClick swallows its own errors internally, so
        // it always returns normally; the verification below detects failure.
        await onLoadAndAnalyseButtonClick();
        // Always restore the canonical seed (regardless of re-analyse
        // outcome) so the book's library identity is preserved for the
        // merge step.
        setUiFieldToValue("startingUrlInput", seedUrl);

        // If the re-analyse did not rebuild a crawlable state for N+1 (fetch
        // failed, leaving the old seed parser, or an empty webPages map),
        // fall back without packing to avoid the "No starting URL found"
        // stall.
        if (parser === preProbeParser
            || !(parser instanceof NoTocChainParser)
            || parser.state.webPages.size === 0) {
            return "probeFailed";
        }

        // 5. Hydrate crawl history (Issue 2) and unify the table writer
        //    (Issue 1). Inject the already-downloaded chapters 1..N from
        //    the stored EPUB (greyed, isIncludeable=false) ahead of the
        //    active seed (N+1, isIncludeable=true), then re-render the
        //    table via the single populateChapterUrlsTable() writer and
        //    reset the fetch state. This makes the seed a normal in-table
        //    row (no orphan direct-child-of-<table> rendered after
        //    </tbody>) and gives the Chain UI parity with the Has-ToC
        //    update experience. Best-effort: on any failure the crawl
        //    still proceeds from N+1 with just the seed row.
        try {
            let history = await Library.LibGetSourceChapterHistory(seedUrl);
            if (history && history.length > 0) {
                let seedChapter = [...parser.state.webPages.values()][0];
                if (seedChapter) {
                    let combined = history.map(h => ({
                        sourceUrl: h.sourceUrl,
                        title: h.title,
                        isIncludeable: false,
                        previousDownload: true
                    }));
                    seedChapter.isIncludeable = true;
                    seedChapter.previousDownload = false;
                    combined.push(seedChapter);
                    let chapterUrlsUI = new ChapterUrlsUI(parser);
                    chapterUrlsUI.populateChapterUrlsTable(combined);
                    parser.setPagesToFetch(combined);
                }
            }
        } catch (e) {
            // Hydration is best-effort; ignore failures.
        }

        return "resumed";
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
        document.getElementById("seriesIndexInput").addEventListener("beforeinput", (event) => seriesIndexInpuValidator(event));
        document.getElementById("manualDelayPerChapterTag").addEventListener("beforeinput", (event) => manualDelayPerChapterValidator(event));
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
        // --- ADDED: Crawler Mode UI Toggle ---
        window.crawlerModeChangeHandler = () => applyCrawlerModeUI(document.getElementById("modeChain").checked);
        const handleManualModeSwitch = (e) => {
            // Apply the mode UI FIRST, then the hard reset: applyCrawlerModeUI(true)
            // hides the Load button in Chain mode, so the reset's "force Load
            // button visible" must run after it to take effect.
            window.crawlerModeChangeHandler();
            if (e.isTrusted) {
                // 0. Capture the user's explicit mode intent at the instant of
                //    the physical click. This is consumed by routeCrawlerMode
                //    on the next Load, bypassing the HeuristicScanner probe.
                explicitUserMode = e.target.id === "modeChain" ? "chain" : "toc";

                // 1. Clear the starting URL input
                setUiFieldToValue("startingUrlInput", "");

                // 2. Clear the chapter list table (leave the header row) and the
                //    stale range-start/end <select> options.
                //    getTableRowsWithChapters() queries all <tr> in the table
                //    subtree, so it clears rows wherever they live.
                ChapterUrlsUI.clearChapterUrlsTable();

                // 3. Force the Load button to appear
                let loadBtn = document.getElementById("loadAndAnalyseButton");
                if (loadBtn) loadBtn.hidden = false;
            }
        };

        document.getElementById("modeToc").addEventListener("change", handleManualModeSwitch);
        document.getElementById("modeChain").addEventListener("change", handleManualModeSwitch);
        window.crawlerModeChangeHandler();
        document.getElementById("nextPageCssInput").addEventListener("input", () => {
            if (parser && typeof parser.updateSnifferStatusUI === "function") {
                parser.updateSnifferStatusUI(initialWebPage, true);
            }
        });
    }
	
    function seriesIndexInpuValidator(event) {
        if (event.data && !/^[0-9.]+$/.test(event.data)) {
            event.preventDefault();
        }
    }

    function manualDelayPerChapterValidator(event) {
        if (event.data && !/^[0-9]+$/.test(event.data)) {
            event.preventDefault();
        }
    }
	
    // Additional metadata
    async function autosearchadditionalmetadata() {
        getPackEpubButton().disabled = true;
        document.getElementById("LibAddToLibrary").disabled = true;
        let titlename = getValueFromUiField("titleInput");
        let url ="https://www.novelupdates.com/series-finder/?sf=1&sh="+titlename;
        if (getValueFromUiField("subjectInput")==null) {
            await autosearchnovelupdates(url, titlename);
        }   
        getPackEpubButton().disabled = false; 
        document.getElementById("LibAddToLibrary").disabled = false;    
    }
	
    async function autosearchnovelupdates(url, titlename) {
        try {
            let xhr = await HttpClient.wrapFetch(url);
            await findnovelupdatesurl(url, xhr.responseXML, titlename);
        } catch (error) {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        }
    }

    async function findnovelupdatesurl(url, dom, titlename) {
        try {    
            let searchurl = [...dom.querySelectorAll("a")].filter(a => a.textContent==titlename)[0];
            setUiFieldToValue("metadataUrlInput", searchurl.href);
            url = getValueFromUiField("metadataUrlInput");
            if (url.includes("novelupdates.com") == true) {
                await onLoadMetadataButtonClick();
            }
        } catch {
            //
        }
    }
	
    async function onLoadMetadataButtonClick() {
        getPackEpubButton().disabled = true;
        document.getElementById("LibAddToLibrary").disabled = true;
        let url = getValueFromUiField("metadataUrlInput");
        try {
            let xhr = await HttpClient.wrapFetch(url);
            populateMetadataAddWithDom(url, xhr.responseXML);
        } catch (error) {
            getLoadAndAnalyseButton().disabled = false;
            ErrorLog.showErrorMessage(error);
        }
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
    window.onload = async () => {
        if (typeof DOMPurify === "undefined" || typeof zip === "undefined") {
            let msg = "Error: WebToEpub is missing required third-party dependencies (DOMPurify or zip.js).\n\nIf you are running from a git clone, please run 'npm install' in the project root to fetch these dependencies.";
            alert(msg);
            let pleaseWait = document.getElementById("findingChapterUrlsMessageRow");
            if (pleaseWait) {
                pleaseWait.textContent = msg;
                pleaseWait.style.color = "red";
                pleaseWait.hidden = false;
            }
            return;
        }
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
            await openTabWindow();
        }
    };

    return {
        getPackEpubButton: getPackEpubButton,
        onLoadAndAnalyseButtonClick : onLoadAndAnalyseButtonClick,
        fetchContentAndPackEpub: fetchContentAndPackEpub,
        resetUI: resetUI,
        getCurrentParser: () => parser,
        getUserPreferences: () => userPreferences,
        maybeProbeChainResume: maybeProbeChainResume
    };
})();
