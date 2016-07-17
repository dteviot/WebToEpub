/*
    Main processing handler for popup.html

*/
var main = (function () {
    "use strict";

    // this will be called when message listener fires
    var onMessageListener = null;

    // details 
    let initalWebPage = null;
    let parser = null;

    // register listener that is invoked when script injected into HTML sends its results 
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.messageType == "ParseResults") {
            console.log("addListener");
            console.log(request);
            if (onMessageListener != null) {
                onMessageListener(request);
            }
        }
    });

    // extract urls from DOM and populate control
    function processInitialHtml(url, dom) {
        if (setParser(url)) {
            try {
                let metaInfo = parser.getEpubMetaInfo(dom);
                populateMetaInfo(metaInfo);
                parser.populateUI();
                parser.onLoadFirstPage(url, dom);
            } catch (error) {
                alert("Error parsing HTML: " + error.stack);
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
        setUiFieldToValue("stylesheetInput", metaInfo.styleSheet);
    }

    function setUiFieldToValue(elementId, value) {
        let element = document.getElementById(elementId);
        if (util.isTextInputField(element) || util.isTextAreaField(element)) {
            element.value = (value == null) ? "" : value;
        } else {
            alert("ERROR: Unhandled field type");
        }
    }

    function metaInfoFromContorls() {
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
        metaInfo.styleSheet = getValueFromUiField("stylesheetInput");

        return metaInfo;
    }

    function getValueFromUiField(elementId) {
        let element = document.getElementById(elementId);
        if (util.isTextInputField(element) || util.isTextAreaField(element)) {
            return (element.value === "") ? null : element.value;
        } else {
            alert("ERROR: Unhandled field type");
            return null;
        }
    }

    function fetchContentAndPackEpub() {
        main.getPackEpubButton().disabled = true;
        parser.fetchContent().then(function () {
            packEpub();
        }).catch(function (err) {
            alert(err);
        });
    }

    function packEpub() {
        let metaInfo = metaInfoFromContorls();
        try {
            let epub = new EpubPacker(metaInfo);
            epub.assembleAndSave(metaInfo.fileName, parser.epubItemSupplier());
        } catch (error) {
            alert("Error packing EPUB. Error: " + error.stack);
        }
    }

    function getActiveTabDOM() {
        chrome.tabs.executeScript({ file: "js/ContentScript.js" },
            function (result) {
                if (chrome.runtime.lastError) {
                    // if fails, assume we're running in tab mode.
                    // but log the error message just in case I'm wrong.
                    console.log(chrome.runtime.lastError.message);
                    configureForTabMode();
                };
            }
        );
    }

    function populateControls() {
        // set up handler to get the response from our injected content script
        onMessageListener = function (message) {
            // convert the string returned from content script back into a DOM
            let dom = new DOMParser().parseFromString(message.document, "text/html");
            populateControlsWithDom(message.url, dom);
        };
        getActiveTabDOM();
    }

    function populateControlsWithDom(url, dom) {
        initalWebPage = dom;

        // set the base tag, in case server did not supply it 
        new HttpClient().setBaseTag(url, initalWebPage);
        processInitialHtml(url, initalWebPage);
    }

    function setParser(url) {
        parser = parserFactory.fetch(url);
        if (parser === undefined) {
            alert("No parser found for this URL.");
            return false;
        }
        return true;
    }

    // called when the "Remove Duplicate Images" check box is ticked or unticked
    function onRemoveDuplicateImagesClick() {
        let enable = document.getElementById("removeDuplicateImages").checked;
        parser.setRemoveDuplicateImages(enable);
    }

    function onCoverFromUrlClick() {
        let enable = document.getElementById("coverFromUrlCheckboxInput").checked;
        parser.onCoverFromUrlClick(enable);
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
        let section = document.getElementById("advancedOptionsSection");
        section.hidden = !section.hidden;
    }

    function onStylesheetToDefaultClick() {
        document.getElementById("stylesheetInput").value = EpubMetaInfo.getDefaultStyleSheet();
    }

    function onOpenAsTabClick() {
        window.open(chrome.extension.getURL("popup.html"), "exampleName");
        window.close();
    }

    function onLoadAndAnalyseButtonClick() {
        // load page via XmlHTTPRequest
        let url = getValueFromUiField("startingUrlInput");
        getLoadAndAnalyseButton().disabled = true;
        let client = new HttpClient();
        return client.fetchHtml(url).then(function (xhr) {
            populateControlsWithDom(url, xhr.responseXML);
            getLoadAndAnalyseButton().disabled = false;
        }).catch(function (error) {
            // ToDo, implement error handler.
            getLoadAndAnalyseButton().disabled = false;
            alert(error);
        });
    }

    function configureForTabMode() {
        document.getElementById("loadAndAnalyseButton").hidden = false;
    }

    function getPackEpubButton() {
        return document.getElementById("packEpubButton");
    }

    function getLoadAndAnalyseButton() {
        return document.getElementById("loadAndAnalyseButton");
    }

    // actions to do when window opened
    window.onload = function () {
        // add onClick event handlers
        getPackEpubButton().onclick = fetchContentAndPackEpub;
        document.getElementById("removeDuplicateImages").onclick = onRemoveDuplicateImagesClick;
        document.getElementById("coverFromUrlCheckboxInput").onclick = onCoverFromUrlClick;
        document.getElementById("diagnosticsCheckBoxInput").onclick = onDiagnosticsClick;
        document.getElementById("reloadButton").onclick = populateControls;
        document.getElementById("advancedOptionsButton").onclick = onAdvancedOptionsClick;
        document.getElementById("stylesheetToDefaultButton").onclick = onStylesheetToDefaultClick;
        document.getElementById("openAsTabButton").onclick = onOpenAsTabClick;
        getLoadAndAnalyseButton().onclick = onLoadAndAnalyseButtonClick;
        populateControls();
    }

    return {
        getPackEpubButton: getPackEpubButton
    };
})();

