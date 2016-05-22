/*
  Parses files on archiveofourown.net
*/
"use strict";

function Parser() {
    this.chapters = [];
}

Parser.prototype.getEpubMetaInfo = function (dom){
    let that = this;
    let metaInfo = new EpubMetaInfo();
    metaInfo.uuid = dom.baseURI;
    metaInfo.title = that.extractTitle(dom);
    metaInfo.author = that.extractAuthor(dom);
    metaInfo.language = that.extractLanguage(dom);
    metaInfo.fileName = that.makeFileName(metaInfo.title);
    return metaInfo;
}

Parser.prototype.makeChapterDoc = function(dom) {
    let that = this;
    let doc = util.createEmptyXhtmlDoc();
    let content = that.findContent(dom)
    if (content != null) {
        util.addToDocBody(doc, content.cloneNode(true));
    }
    return doc;
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

// Name to save file as. Default is strip spaces from title and add ".epub" extension.
Parser.prototype.makeFileName = function(title) {
    if (title == null) {
        return "web.epub";
    } else {
        // strip spaces
        title = title.replace(/\s+/g, "");

        // replace characters that are not legal in filenames
        // ToDo: add rest of illegal chars.
        title = title.replace(/:|\?|\*|\\/g, "-")

        // append suffix
        return title + ".epub";
    }
}

Parser.prototype.epubItemSupplier = function (chapters) {
    if (chapters == undefined) {
        chapters = this.chapters;
    }
    let supplier = new EpubItemSupplier(this);
    supplier.setChapters(chapters);
    return supplier;
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
    let linksTable = document.getElementById("chapterUrlsTable");
    while (linksTable.children.length > 1) {
        linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
    }
    chapters.forEach(function (chapter) {
        let row = document.createElement("tr");
        that.appendColumnDataToRow(row, chapter.title);
        chapter.stateColumn = that.appendColumnDataToRow(row, "No");
        that.appendColumnDataToRow(row, chapter.sourceUrl);
        linksTable.appendChild(row);
    });
}

// called when plugin has obtained the first web page
Parser.prototype.onLoadFirstPage = function (url, firstPageDom) {
    let that = this;
    let chapters = that.getChapterUrls(firstPageDom);
    that.populateChapterUrls(chapters);
    if ((0 < chapters.length) && (chapters[0].sourceUrl === url)) {
        chapters[0].rawDom = firstPageDom;
        that.updateLoadState(chapters[0]);
        this.getProgressBar().value = 0;
    }
    that.chapters = chapters;
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
        this.setUiToShowLoadingProgress(this.chapters.length);
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

    // for testing, uncomment the following line
    // that.FakeNetworkActivity(client);

    var sequence = Promise.resolve();
    that.chapters.forEach(function(chapter) {
        sequence = sequence.then(function () {
            return client.fetchHtml(chapter.sourceUrl);
        }).then(function (rawDom) {
            chapter.rawDom = rawDom;
            that.updateLoadState(chapter);
        }); 
    });
    sequence = sequence.then(function() {
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
        zipFile.file("chapter" + i + ".html", that.chapters[i].rawDom.documentElement.outerHTML, { compression: "DEFLATE" });
    }
    new EpubPacker().save(zipFile.generate({ type: "blob" }), "raw.zip");
}

Parser.prototype.FakeNetworkActivity = function(client) {
    client.sendRequest = function (xhr) { xhr.onload.call() };
    client.oldOnLoadHtml = client.onLoadHtml;
    client.onLoadHtml = function (url, xhr, event, onHtlmReceived, resolve, reject) {
        xhr = testFunctions.fakeArchiveOfOurOwnXmlHttpResponse();
        client.oldOnLoadHtml(url, xhr, event, onHtlmReceived, resolve, reject);
    };
}
