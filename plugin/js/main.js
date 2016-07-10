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
        chrome.tabs.executeScript({file: "js/ContentScript.js"});
    }

    function populateControls() {
        // set up handler to get the response from our injected content script
        onMessageListener = function (message) {
            // convert the string returned from content script back into a DOM
            initalWebPage = new DOMParser().parseFromString(message.document, "text/html");

            // set the base tag, in case server did not supply it 
            new HttpClient().setBaseTag(message.url, initalWebPage);
            processInitialHtml(message.url, initalWebPage);
        };
        getActiveTabDOM();
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
        document.getElementById("stylesheetInput").innerText = EpubMetaInfo.getDefaultStyleSheet();
    }

    function getPackEpubButton() {
        return document.getElementById("packEpubButton");
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
        populateControls();
    }

    return {
        getPackEpubButton: getPackEpubButton
    };
})();

