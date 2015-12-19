/*
    Main processing handler for popup.html

*/
(function () {
    "use strict";

    // this will be called when message listener fires
    var onMessageListener = null;

    // details 
    let chapters = [];
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

    function appendColumnDataToRow(row, textData) {
        let col = document.createElement("td");
        col.innerText = textData;
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    }

    function populateChapterUrls(chapters) {
        let linksTable = document.getElementById("chapterUrlsTable");
        while (linksTable.children.length > 1) {
            linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
        }
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            appendColumnDataToRow(row, chapter.title);
            chapter.stateColumn = appendColumnDataToRow(row, "No");
            appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
        });
    }

    // extract urls from DOM and populate control
    function processInitialHtml(url, dom) {
        if (setParser(url)) {
            let metaInfo = parser.getEpubMetaInfo(dom);
            populateMetaInfo(metaInfo);
            chapters = parser.getChapterUrls(dom);
            populateChapterUrls(chapters);
            if ((0 < chapters.length) && (chapters[0].sourceUrl === url)) {
                chapters[0].rawDom = dom;
                updateLoadState(chapters[0]);
            }
        }
    }

    function onFetchChapters() {
        if (0 == chapters.length) {
            alert("No chapters found.");
        } else {
            setUiToShowChapterLoadingProgress();
            let client = new HttpClient();

            // for testing, uncomment the following lines
            /*
            client.sendRequest = function (xhr) { xhr.onload.call() };
            client.oldOnLoadHtml = client.onLoadHtml;
            client.onLoadHtml = function (url, xhr, event, onHtlmReceived) {
                xhr = testFunctions.fakeArchiveOfOurOwnXmlHttpResponse();
                client.oldOnLoadHtml(url, xhr, event, onHtlmReceived);
            };
            */
            onLoadChapter(0, client);
        }
    };

    function setUiToShowChapterLoadingProgress() {
        getPackEpubButton().disabled = true;
        getProgressBar().max = chapters.length;
        getProgressBar().value = 0;
    }

    function onLoadChapter(chapterIndex, client) {
        if (chapterIndex < chapters.length) {
            let chapter = chapters[chapterIndex];
            client.fetchHtml(chapter.sourceUrl, function (url, rawDom) {
                chapter.rawDom = rawDom;
                updateLoadState(chapter);
                onLoadChapter(chapterIndex + 1, client);
            });
        } else {
            getPackEpubButton().disabled = false;
        }
    }

    function updateLoadState(chapter) {
        chapter.stateColumn.innerText = "Yes";
        getProgressBar().value += 1;
    }

    function onChaptersLoaded() {
        testFunctions.dumpChapters(chapters);
    }

    function populateMetaInfo(metaInfo) {
        document.getElementById("startingUrlInput").value = metaInfo.uuid;
        document.getElementById("titleInput").value = metaInfo.title;
        document.getElementById("authorInput").value = metaInfo.author;
        document.getElementById("languageInput").value = metaInfo.language;
        document.getElementById("fileNameInput").value = metaInfo.fileName;
    }

    function metaInfoFromContorls() {
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = document.getElementById("startingUrlInput").value;
        metaInfo.title = document.getElementById("titleInput").value;
        metaInfo.author = document.getElementById("authorInput").value;
        metaInfo.language = document.getElementById("languageInput").value;
        metaInfo.fileName = document.getElementById("fileNameInput").value;
        return metaInfo;
    }

    function packEpub() {
        let metaInfo = metaInfoFromContorls();
        let i = 0;
        try {
            let epub = new EpubPacker(metaInfo);
            epub.assembleAndSave(metaInfo.fileName, parser.epubItemSupplier(chapters));
        } catch (error) {
            alert("Error packing EPUB. Chapter " + i + " Error: " + error.stack);
        }
    }

    function getActiveTabDOM() {
        chrome.tabs.executeScript({file: "js/ContentScript.js"});
    }

    function populateControls() {
        // set up handler to get the response from our injected content script
        onMessageListener = function (message) {
            // convert the string returned from content script back into a DOM
            let dom = new DOMParser().parseFromString(message.document, "text/html");

            // set the base tag, in case server did not supply it 
            new HttpClient().setBaseTag(message.url, dom);
            processInitialHtml(message.url, dom);
        };
        getActiveTabDOM();
    }

    function setParser(url) {
        let parsers = ParserFactory(url);
        if (parsers.length === 0) {
            alert("No parser found for this URL.");
        } else {
            if (parsers.length > 1) {
                alert("Multiple parsers found for this URL.");
            }
            parser = parsers[0];
        }
        return parser !== null;
    }

    // called when the "Diagnostics" check box is ticked or unticked
    function onDiagnosticsClick() {
        let enable = document.getElementById("diagnosticsCheckBoxInput").checked;
        document.getElementById("reloadButton").hidden = !enable;
        document.getElementById("packRawButton").hidden = !enable;
        document.getElementById("testToXhtmlButton").hidden = !enable;
    }

    // pack the raw chapter HTML into a zip file (for later manual analysis)
    function packRawChapters() {
        let that = this;
        let zipFile = new JSZip();
        for (let i = 0; i < chapters.length; ++i) {
            zipFile.file("chapter" + i + ".html", chapters[i].rawDom.documentElement.outerHTML, { compression: "DEFLATE" });
        }
        new EpubPacker().save(zipFile.generate({ type: "blob" }), "raw.zip");
    }

    function getProgressBar() {
        return document.getElementById("fetchChaptersProgress");
    }

    function getPackEpubButton() {
        return document.getElementById("packEpubButton");
    }

    function onTestToXhtml() {
        if (0 < chapters.length) {
            
            // test Cleanup function
            let doc = chapters[0].rawDom;

            // doc = parser.toXhtml(doc);
            // let blob = new Blob([new XMLSerializer().serializeToString(doc)], { type: 'text/html' });
            let zipFile = parser.testChapterSplit(doc);
            new EpubPacker().save(zipFile.generate({ type: "blob" }), "xhtml.zip");
        }
    }

    // actions to do when window opened
    window.onload = function () {
        // add onClick event handlers
        document.getElementById("fetchChaptersButton").onclick = onFetchChapters;
        getPackEpubButton().onclick = packEpub;
        document.getElementById("diagnosticsCheckBoxInput").onclick = onDiagnosticsClick;
        document.getElementById("reloadButton").onclick = populateControls;
        document.getElementById("packRawButton").onclick = packRawChapters;
        document.getElementById("testToXhtmlButton").onclick = onTestToXhtml;
        populateControls();
    }

})();

