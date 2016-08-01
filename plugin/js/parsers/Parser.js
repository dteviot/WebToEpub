/*
  Base class that all parsers build from.
*/
"use strict";

class Parser {
    constructor(imageCollector) {
        this.chapters = [];
        this.imageCollector = imageCollector || new ImageCollector();
    }

    onUserPreferencesUpdate(userPreferences) {
        this.imageCollector.onUserPreferencesUpdate(userPreferences);
    }

    getChapterUrlsTable() {
        return document.getElementById("chapterUrlsTable");
    }

    getSelectAllUrlsButton() {
        return document.getElementById("selectAllUrlsButton");
    }

    getUnselectAllUrlsButton() {
        return document.getElementById("unselectAllUrlsButton");
    }

    setAllUrlsSelectState(select) {
        let linksTable = this.getChapterUrlsTable();
        for(let row of linksTable.children) {
            let input = util.getElement(row, "input", i => i.type === "checkbox");
            if ((input !== null) && (input.checked !== select)) {
                input.checked = select;
                input.onclick();
            }
        }
    }

    isChapterPackable(chapter) {
        return (chapter.rawDom != null) && (chapter.isIncludeable);
    }

    convertRawDomToContent(chapter) {
        let that = this;
        let content = that.findContent(chapter.rawDom);
        that.customRawDomToContentStep(chapter, content);
        that.removeUnwantedElementsFromContentElement(content);
        util.fixBlockTagsNestedInInlineTags(content);
        that.imageCollector.processImages(content);
        util.removeUnusedHeadingLevels(content);
        util.prepForConvertToXhtml(content);
        util.removeEmptyDivElements(content);
        return content;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeScriptableElements(element);
        util.removeComments(element);
    };

    customRawDomToContentStep(chapter, content) {
        // override for any custom processing
    }
}

Parser.prototype.getEpubMetaInfo = function (dom){
    let that = this;
    let metaInfo = new EpubMetaInfo();
    metaInfo.uuid = dom.baseURI;
    metaInfo.title = that.extractTitle(dom);
    metaInfo.author = that.extractAuthor(dom);
    metaInfo.language = that.extractLanguage(dom);
    metaInfo.fileName = that.makeFileName(metaInfo.title);
    that.extractSeriesInfo(dom, metaInfo);
    return metaInfo;
}

Parser.prototype.singleChapterStory = function (baseUrl, dom) {
    return [{
        sourceUrl: baseUrl,
        title: this.extractTitle(dom)
    }];
}

Parser.prototype.getElements = function(dom, tagName, filter) {
    return util.getElements(dom, tagName, filter);
}

Parser.prototype.getElement = function(dom, tagName, filter) {
    return util.getElement(dom, tagName, filter);
}

Parser.prototype.getBaseUrl = function (dom) {
    return Array.prototype.slice.apply(dom.getElementsByTagName("base"))[0].href;
}

// Name to save EPUB file as.
Parser.prototype.makeFileName = function(title) {
    if (title == null) {
        return "web.epub";
    } else {
        // allow only legal characters within the file name
        title = util.safeForFileName(title);

        // append suffix
        return title + ".epub";
    }
}

Parser.prototype.epubItemSupplier = function () {
    let that = this;
    let epubItems = that.chaptersToEpubItems(that.chapters);
    let supplier = new EpubItemSupplier(this, epubItems, that.imageCollector);
    return supplier;
}

Parser.prototype.chaptersToEpubItems = function (chapters) {
    let that = this;
    let epubItems = [];
    let index = -1;
    for(let chapter of chapters.filter(c => that.isChapterPackable(c))) {
        let content = that.convertRawDomToContent(chapter);
        if (content != null) {
            let epubItem = new ChapterEpubItem(chapter, content, ++index);
            epubItems.push(epubItem);
        }
    }
    return epubItems;
}

Parser.prototype.appendColumnDataToRow = function (row, textData) {
    let col = document.createElement("td");
    col.innerText = textData;
    col.style.whiteSpace = "nowrap";
    row.appendChild(col);
    return col;
}

Parser.prototype.populateChapterUrls = function (chapters) {
    let that = this;
    let linksTable = that.getChapterUrlsTable();
    while (linksTable.children.length > 1) {
        linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
    }
    chapters.forEach(function (chapter) {
        let row = document.createElement("tr");
        that.appendCheckBoxToRow(row, chapter);
        that.appendColumnDataToRow(row, chapter.title);
        chapter.stateColumn = that.appendColumnDataToRow(row, "No");
        that.appendColumnDataToRow(row, chapter.sourceUrl);
        linksTable.appendChild(row);
    });
}

Parser.prototype.appendCheckBoxToRow = function (row, chapter) {
    let col = document.createElement("td");
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    chapter.isIncludeable = true;
    checkbox.checked = chapter.isIncludeable;
    checkbox.onclick = function() { chapter.isIncludeable = checkbox.checked; };
    col.appendChild(checkbox);
    row.appendChild(col);
}

// called when plugin has obtained the first web page
Parser.prototype.onLoadFirstPage = function (url, firstPageDom) {
    let that = this;
    
    // returns promise, because may need to fetch additional pages to find list of chapters
    that.getChapterUrls(firstPageDom).then(function(chapters) {
        that.populateChapterUrls(chapters);
        if (0 < chapters.length) {
            if (chapters[0].sourceUrl === url) {
                chapters[0].rawDom = firstPageDom;
                that.updateLoadState(chapters[0]);
            }
            that.getProgressBar().value = 0;
            that.getSelectAllUrlsButton().onclick = (e => that.setAllUrlsSelectState(true));
            that.getUnselectAllUrlsButton().onclick = ( e=> that.setAllUrlsSelectState(false));
        }
        that.chapters = chapters;
    }).catch(function(error) {
        alert(error)
    });
}

Parser.prototype.populateUI = function () {
    let that = this;
    that.getFetchContentButton().onclick = (e => that.onFetchChaptersClicked());
    document.getElementById("packRawButton").onclick = (e => that.packRawChapters());
}

Parser.prototype.onFetchChaptersClicked = function () {
    if (0 == this.chapters.length) {
        alert("No chapters found.");
    } else {
        this.getFetchContentButton().disabled = true;
        this.fetchChapters();
    }
}

Parser.prototype.fetchContent = function () {
    return this.fetchChapters();
}

Parser.prototype.setUiToShowLoadingProgress = function(length) {
    let that = this;
    main.getPackEpubButton().disabled = true;
    this.getProgressBar().max = length + 1;
    this.getProgressBar().value = 1;
}

Parser.prototype.fetchChapters = function() {
    let that = this;
    let client = new HttpClient();

    let pagesToFetch = that.chapters.filter(c => c.isIncludeable);
    if (pagesToFetch.length === 0) {
        return Promise.reject(new Error("No chapters found."));
    }

    this.setUiToShowLoadingProgress(pagesToFetch.length);

    // for testing, uncomment the following line
    // that.FakeNetworkActivity(client);

    var sequence = Promise.resolve();
    pagesToFetch.forEach(function(chapter) {
        sequence = sequence.then(function () {
            return client.fetchHtml(chapter.sourceUrl);
        }).then(function (xhr) {
            chapter.rawDom = xhr.responseXML;
            that.updateLoadState(chapter);
            let content = that.findContent(chapter.rawDom);
            that.imageCollector.findImagesUsedInDocument(content);
        }); 
    });
    sequence = sequence.then(function() {
        that.setUiToShowLoadingProgress(that.imageCollector.images.size);
        return that.imageCollector.fetchImages(() => that.getProgressBar().value += 1);
    }).then(function () {
        that.getFetchContentButton().disabled = false;
        main.getPackEpubButton().disabled = false;
    }).catch(function (err) {
        alert(err);
    })
    return sequence;
}

Parser.prototype.updateLoadState = function(chapter) {
    chapter.stateColumn.innerText = "Yes";
    this.getProgressBar().value += 1;
}

Parser.prototype.getProgressBar = function() {
    return document.getElementById("fetchProgress");
}

Parser.prototype.getFetchContentButton = function() {
    return document.getElementById("fetchChaptersButton")
}

// pack the raw chapter HTML into a zip file (for later manual analysis)
Parser.prototype.packRawChapters = function() {
    let that = this;
    let zipFile = new JSZip();
    for (let i = 0; i < that.chapters.length; ++i) {
        if (that.chapters[i].rawDom != null) {
            zipFile.file("chapter" + i + ".html", that.chapters[i].rawDom.documentElement.outerHTML, { compression: "DEFLATE" });
        };
    }
    zipFile.generateAsync({ type: "blob" }).then(function(content) {
        EpubPacker.save(content, "raw.zip");
    }).catch(function(error) {
        alert(error);
    });
}

Parser.prototype.FakeNetworkActivity = function(client) {
    client.sendRequest = function (xhr) { xhr.onload.call() };
    client.oldOnLoadHtml = client.onLoadHtml;
    client.onLoadHtml = function (url, xhr, event, onHtlmReceived, resolve, reject) {
        xhr = testFunctions.fakeArchiveOfOurOwnXmlHttpResponse();
        client.oldOnLoadHtml(url, xhr, event, onHtlmReceived, resolve, reject);
    };
}

Parser.prototype.extractLanguage = function(dom) {
    // if HTML doesn't have language, default to english
    return "en";
};

Parser.prototype.extractSeriesInfo = function(dom, metaInfo) {
    // Derived classes will override
}

Parser.prototype.setCoverImage = function(imageInfo) {
    this.imageCollector.setCoverImage(imageInfo);
}
