/*
  Base class that all parsers build from.
*/
"use strict";

class Parser {
    constructor(imageCollector) {
        this.chapters = [];
        this.imageCollector = imageCollector || new ImageCollector();
        this.userPreferences = null;
    }

    onUserPreferencesUpdate(userPreferences) {
        this.userPreferences = userPreferences;
        this.imageCollector.onUserPreferencesUpdate(userPreferences);
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
        that.imageCollector.replaceImageTags(content);
        util.removeUnusedHeadingLevels(content);
        util.removeUnneededIds(content);
        util.makeHyperlinksRelative(chapter.rawDom.baseURI, content);
        util.setStyleToDefault(content);
        util.prepForConvertToXhtml(content);
        util.removeEmptyDivElements(content);
        util.removeTrailingWhiteSpace(content);
        if (util.isElementWhiteSpace(content)) {
            let errorMsg = chrome.i18n.getMessage("warningNoVisibleContent", [chapter.sourceUrl]);
            window.showErrorMessage(errorMsg);
        }
        return content;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeElements(util.getElements(element, "noscript"));
        util.removeUnwantedWordpressElements(element);
    };

    customRawDomToContentStep(chapter, content) { // eslint-disable-line no-unused-vars
        // override for any custom processing
    }

    populateUI(dom) {
        this.getFetchContentButton().onclick = this.onFetchChaptersClicked.bind(this);
        document.getElementById("packRawButton").onclick = this.packRawChapters.bind(this);
        let coverUrl = this.findCoverImageUrl(dom);
        if (!util.isNullOrEmpty(coverUrl)) {
            CoverImageUI.setCoverImageUrl(coverUrl);
        };
    }

    /**
     * Default implementation, take first image in content section
    */
    findCoverImageUrl(dom) {
        if (dom != null) {
            let content = this.findContent(dom);
            if (content != null) {
                let cover = util.getElement(content, "img");
                if (cover != null) {
                    return cover.src;
                };
            };
        };
        return null;
    }

    removeNextAndPreviousChapterHyperlinks(element) {
        let that = this;
        let chapterLinks = new Set();
        for(let c of that.chapters) { 
            chapterLinks.add(util.normalizeUrl(c.sourceUrl));
        };

        for(let unwanted of util.getElements(element, "a", link => chapterLinks.has(util.normalizeUrl(link.href)))
            .map(link => that.findParentNodeOfChapterLinkToRemoveAt(link))) {
            util.removeNode(unwanted);
        };
    }

    /**
    * default implementation turns each chapter into single epub item
    */
    chapterToEpubItems(chapter, epubItemIndex) {
        let content = this.convertRawDomToContent(chapter);
        let items = [];
        if (content != null) {
            items.push(new ChapterEpubItem(chapter, content, epubItemIndex));
        }
        return items;
    }

    /**
    * default implementation, use the <title> element
    */
    extractTitle(dom) {
        return util.getElement(dom, "title").innerText.trim();
    };

    /**
    * default implementation
    */
    extractAuthor(dom) {  // eslint-disable-line no-unused-vars
        return "<unknown>";
    }

    /**
    * default implementation, a number of sites use jetpack tags
    * but if not available, default to English
    */
    extractLanguage(dom) {
        let locale = util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:locale"));
        return (locale === null) ? "en" : locale.getAttribute("content");
    }

    /**
    * default implementation, Derived classes will override
    */
    extractSeriesInfo(dom, metaInfo) {  // eslint-disable-line no-unused-vars
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
    let index = 0;
    for(let chapter of chapters.filter(c => that.isChapterPackable(c))) {
        let newItems = that.chapterToEpubItems(chapter, index);
        epubItems = epubItems.concat(newItems);
        index += newItems.length;
    }
    return epubItems;
}

// called when plugin has obtained the first web page
Parser.prototype.onLoadFirstPage = function (url, firstPageDom) {
    let that = this;
    
    // returns promise, because may need to fetch additional pages to find list of chapters
    that.getChapterUrls(firstPageDom).then(function(chapters) {
        let chapterUrlsUI = new ChapterUrlsUI(that);
        chapterUrlsUI.populateChapterUrlsTable(chapters, that.userPreferences);
        if (0 < chapters.length) {
            if (chapters[0].sourceUrl === url) {
                chapters[0].rawDom = firstPageDom;
                that.updateLoadState(chapters[0]);
            }
            that.getProgressBar().value = 0;
        }
        that.chapters = chapters;
        chapterUrlsUI.connectButtonHandlers();
    }).catch(function (err) {
        window.showErrorMessage(err);
    });
}

Parser.prototype.onFetchChaptersClicked = function () {
    if (0 == this.chapters.length) {
        window.showErrorMessage(chrome.i18n.getMessage("noChaptersFoundAndFetchClicked"));
    } else {
        this.getFetchContentButton().disabled = true;
        this.fetchChapters();
    }
}

Parser.prototype.fetchContent = function () {
    return this.fetchChapters();
}

Parser.prototype.setUiToShowLoadingProgress = function(length) {
    main.getPackEpubButton().disabled = true;
    this.getProgressBar().max = length + 1;
    this.getProgressBar().value = 1;
}

Parser.prototype.fetchChapters = function() {
    let that = this;

    let pagesToFetch = that.chapters.filter(c => c.isIncludeable);
    if (pagesToFetch.length === 0) {
        return Promise.reject(new Error("No chapters found."));
    }

    this.setUiToShowLoadingProgress(pagesToFetch.length);

    var sequence = Promise.resolve();

    that.imageCollector.reset();
    that.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());

    pagesToFetch.forEach(function(chapter) {
        sequence = sequence.then(function () {
            return HttpClient.wrapFetch(chapter.sourceUrl);
        }).then(function (xhr) {
            chapter.rawDom = xhr.responseXML;
            that.updateLoadState(chapter);
            let content = that.findContent(chapter.rawDom);
            if (content == null) {
                chapter.isIncludeable = false;
                let errorMsg = chrome.i18n.getMessage("errorContentNotFound", [chapter.sourceUrl]);
                throw new Error(errorMsg);
            }
            that.imageCollector.findImagesUsedInDocument(content);
            return that.imageCollector.fetchImages(() => { });
        }); 
    });
    sequence = sequence.then(function() {
        that.getFetchContentButton().disabled = false;
        main.getPackEpubButton().disabled = false;
    }).catch(function (err) {
        util.logError(err);
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
        window.showErrorMessage(error);
    });
}
