/*
  Base class that all parsers build from.
*/
"use strict";

/**
 * A Parser's state variables
*/
class ParserState {
    constructor() {
        this.webPages = new Map();
        this.chapterListUrl = null;
    }

    setPagesToFetch(urls) {
        let nextPrevChapters = new Set();
        this.webPages = new Map();
        for(let i = 0; i < urls.length; ++i) {
            let page = urls[i];
            if (i < urls.length - 1) {
                nextPrevChapters.add(util.normalizeUrlForCompare(urls[i + 1].sourceUrl));
            };
            page.nextPrevChapters = nextPrevChapters;
            this.webPages.set(page.sourceUrl, page);
            nextPrevChapters = new Set();
            nextPrevChapters.add(util.normalizeUrlForCompare(page.sourceUrl));
        }
    }
}

class Parser {
    constructor(imageCollector) {
        this.state = new ParserState();
        this.imageCollector = imageCollector || new ImageCollector();
        this.userPreferences = null;
    }

    copyState(otherParser) {
        this.state = otherParser.state;
        this.imageCollector.copyState(otherParser.imageCollector);
        this.userPreferences = otherParser.userPreferences;
    }

    setPagesToFetch(urls) {
        this.state.setPagesToFetch(urls);
    }

    getPagesToFetch() {
        return this.state.webPages;
    }

    onUserPreferencesUpdate(userPreferences) {
        this.userPreferences = userPreferences;
        this.imageCollector.onUserPreferencesUpdate(userPreferences);
    }

    isWebPagePackable(webPage) {
        return (webPage.rawDom != null) && (webPage.isIncludeable);
    }

    convertRawDomToContent(webPage) {
        let content = this.findContent(webPage.rawDom);
        this.customRawDomToContentStep(webPage, content);
        util.decodeCloudflareProtectedEmails(content);
        this.removeNextAndPreviousChapterHyperlinks(webPage, content);
        this.removeUnwantedElementsFromContentElement(content);
        this.addTitleToContent(webPage, content);
        util.fixBlockTagsNestedInInlineTags(content);
        this.imageCollector.replaceImageTags(content);
        util.removeUnusedHeadingLevels(content);
        util.makeHyperlinksRelative(webPage.rawDom.baseURI, content);
        util.setStyleToDefault(content);
        util.prepForConvertToXhtml(content);
        util.removeEmptyDivElements(content);
        util.removeTrailingWhiteSpace(content);
        if (util.isElementWhiteSpace(content)) {
            let errorMsg = chrome.i18n.getMessage("warningNoVisibleContent", [webPage.sourceUrl]);
            ErrorLog.showErrorMessage(errorMsg);
        }
        return content;
    }

    addTitleToContent(webPage, content) {
        let title = this.findChapterTitle(webPage.rawDom);
        if (title !== null) {
            content.insertBefore(title, content.firstChild);
        };
    }

    /**
     * Element with title of an individual chapter
     * Override when chapter title not in content element
    */
    findChapterTitle(dom) {   // eslint-disable-line no-unused-vars
        return null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeElements(element.querySelectorAll("noscript, input"));
        util.removeUnwantedWordpressElements(element);
        util.removeMicrosoftWordCrapElements(element);
        util.removeShareLinkElements(element);
        util.removeLeadingWhiteSpace(element);
    };

    customRawDomToContentStep(chapter, content) { // eslint-disable-line no-unused-vars
        // override for any custom processing
    }

    populateUI(dom) {
        CoverImageUI.showCoverImageUrlInput(true);
        let coverUrl = this.findCoverImageUrl(dom);
        CoverImageUI.setCoverImageUrl(coverUrl);
    }

    /**
     * Default implementation, take first image in content section
    */
    findCoverImageUrl(dom) {
        if (dom != null) {
            let content = this.findContent(dom);
            if (content != null) {
                let cover = content.querySelector("img");
                if (cover != null) {
                    return cover.src;
                };
            };
        };
        return null;
    }

    removeNextAndPreviousChapterHyperlinks(webPage, element) {
        let elementToRemove = (this.findParentNodeOfChapterLinkToRemoveAt != null) ?
            this.findParentNodeOfChapterLinkToRemoveAt.bind(this)
            : (element) => element;

        let chapterLinks = [...element.querySelectorAll("a")]
            .filter(link => webPage.nextPrevChapters.has(util.normalizeUrlForCompare(link.href)))
            .map(link => elementToRemove(link));
        util.removeElements(chapterLinks);
    }

    /**
    * default implementation turns each webPage into single epub item
    */
    webPageToEpubItems(webPage, epubItemIndex) {
        let content = this.convertRawDomToContent(webPage);
        let items = [];
        if (content != null) {
            items.push(new ChapterEpubItem(webPage, content, epubItemIndex));
        }
        return items;
    }

    /**
    * default implementation, use the <title> element
    */
    extractTitle(dom) {
        return dom.title.trim();
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
        let locale = dom.querySelector("meta[property='og:locale']");
        return (locale === null) ? "en" : locale.getAttribute("content");
    }

    /**
    * default implementation, Derived classes will override
    */
    extractSeriesInfo(dom, metaInfo) {  // eslint-disable-line no-unused-vars
    }

    getEpubMetaInfo(dom){
        let that = this;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = dom.baseURI;
        metaInfo.title = that.extractTitle(dom);
        metaInfo.author = that.extractAuthor(dom);
        metaInfo.language = that.extractLanguage(dom);
        metaInfo.fileName = that.makeSaveAsFileNameWithoutExtension(metaInfo.title);
        that.extractSeriesInfo(dom, metaInfo);
        return metaInfo;
    }

    singleChapterStory(baseUrl, dom) {
        return [{
            sourceUrl: baseUrl,
            title: this.extractTitle(dom)
        }];
    }

    getBaseUrl(dom) {
        return Array.from(dom.getElementsByTagName("base"))[0].href;
    }

    makeSaveAsFileNameWithoutExtension(title) {
        return (title == null)  ? "web" : util.safeForFileName(title);
    }

    epubItemSupplier() {
        let epubItems = this.webPagesToEpubItems([...this.state.webPages.values()]);
        this.fixupHyperlinksInEpubItems(epubItems);
        let supplier = new EpubItemSupplier(this, epubItems, this.imageCollector);
        return supplier;
    }

    webPagesToEpubItems(webPages) {
        let epubItems = [];
        let index = 0;
        let initialHostName = this.initialHostName();

        if (this.getInformationEpubItemChildNodes !== undefined) {
            epubItems.push(this.makeInformationEpubItem(this.state.firstPageDom));
            ++index;
        }

        for(let webPage of webPages.filter(c => this.isWebPagePackable(c))) {
            let pageParser = this.parserForWebPage(initialHostName, webPage);
            let newItems = pageParser.webPageToEpubItems(webPage, index);
            epubItems = epubItems.concat(newItems);
            index += newItems.length;
            delete(webPage.rawDom);
        }
        return epubItems;
    }

    makeInformationEpubItem(dom) {
        let titleText = chrome.i18n.getMessage("informationPageTitle");
        let div = document.createElement("div");
        let title = document.createElement("h1");
        title.appendChild(document.createTextNode(titleText));
        div.appendChild(title);
        let urlElement = document.createElement("p");
        let bold = document.createElement("b");
        bold.textContent = chrome.i18n.getMessage("tableOfContentsUrl");
        urlElement.appendChild(bold);
        urlElement.appendChild(document.createTextNode(this.state.chapterListUrl));
        div.appendChild(urlElement);
        let childNodes = [div].concat(this.getInformationEpubItemChildNodes(dom));
        let chapter = {
            sourceUrl: this.state.chapterListUrl,
            title: titleText,
            newArch: null
        };
        return new ChapterEpubItem(chapter, {childNodes: childNodes}, 0);
    }

    // called when plugin has obtained the first web page
    onLoadFirstPage(url, firstPageDom) {
        let that = this;
        this.state.firstPageDom = firstPageDom;
        this.state.chapterListUrl = url;
        let chapterUrlsUI = new ChapterUrlsUI(this);
        
        // returns promise, because may need to fetch additional pages to find list of chapters
        that.getChapterUrls(firstPageDom).then(function(chapters) {
            if (that.userPreferences.chaptersPageInChapterList.value) {
                chapters = that.addFirstPageUrlToWebPages(url, firstPageDom, chapters);
            }
            chapters = that.cleanWebPageUrls(chapters);
            chapterUrlsUI.populateChapterUrlsTable(chapters);
            if (0 < chapters.length) {
                if (chapters[0].sourceUrl === url) {
                    chapters[0].rawDom = firstPageDom;
                    that.updateLoadState(chapters[0]);
                }
                ProgressBar.setValue(0);
            }
            that.state.setPagesToFetch(chapters);
            chapterUrlsUI.connectButtonHandlers();
        }).catch(function (err) {
            ErrorLog.showErrorMessage(err);
        });
    }

    cleanWebPageUrls(webPages) {
        let foundUrls = new Set();
        let isUnique = function(webPage) {
            let unique = !foundUrls.has(webPage.sourceUrl);
            if (unique) {
                foundUrls.add(webPage.sourceUrl);
            }
            return unique;
        }

        return webPages
            .map(this.fixupImgurGalleryUrl)
            .filter(isUnique);
    }

    fixupImgurGalleryUrl(webPage) {
        webPage.sourceUrl = Imgur.fixupImgurGalleryUrl(webPage.sourceUrl);
        return webPage;
    }

    addFirstPageUrlToWebPages(url, firstPageDom, webPages) {
        let present = webPages.find(e => e.sourceUrl === url);
        if (present)
        {
            return webPages;
        } else {
            return [{
                sourceUrl:  url,
                title: this.extractTitle(firstPageDom)
            }].concat(webPages);
        }
    }

    onFetchChaptersClicked() {
        if (0 == this.state.webPages.size) {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("noChaptersFoundAndFetchClicked"));
        } else {
            this.fetchWebPages();
        }
    }

    fetchContent() {
        return this.fetchWebPages();
    }

    setUiToShowLoadingProgress(length) {
        main.getPackEpubButton().disabled = true;
        ProgressBar.setMax(length + 1);
        ProgressBar.setValue(1);
    }

    fetchWebPages() {
        let that = this;

        let pagesToFetch = [...this.state.webPages.values()].filter(c => c.isIncludeable);
        if (pagesToFetch.length === 0) {
            return Promise.reject(new Error("No chapters found."));
        }

        this.setUiToShowLoadingProgress(pagesToFetch.length);

        var sequence = Promise.resolve();

        that.imageCollector.reset();
        that.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());

        let initialHostName = this.initialHostName();
        let fetchFunc = (webPage) => this.fetchWebPageContent(webPage, initialHostName);
        
        let simultanousFetchSize = parseInt(that.userPreferences.maxPagesToFetchSimultaneously.value);
        for(let group of Parser.groupPagesToFetch(pagesToFetch, simultanousFetchSize)) {
            sequence = sequence.then(function () {
                return Promise.all(group.map(fetchFunc));
            }); 
        }
        sequence = sequence.then(function() {
            main.getPackEpubButton().disabled = false;
        }).catch(function (err) {
            ErrorLog.log(err);
        })
        return sequence;
    }

    static groupPagesToFetch(webPages, blockSize) {
        let blocks = [];
        let block = [];
        for(let i = 0; i < webPages.length; ++i) {
            block.push(webPages[i]);
            if (block.length === blockSize) {
                blocks.push(block);
                block = [];
            }
        }
        if (0 < block.length) {
            blocks.push(block);
        }
        return blocks;
    }

    fetchWebPageContent(webPage, initialHostName) {
        let that = this;
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
        return that.fetchChapter(webPage.sourceUrl).then(function (webPageDom) {
            webPage.rawDom = webPageDom;
            let pageParser = that.parserForWebPage(initialHostName, webPage);
            pageParser.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
            let content = pageParser.findContent(webPage.rawDom);
            if (content == null) {
                webPage.isIncludeable = false;
                let errorMsg = chrome.i18n.getMessage("errorContentNotFound", [webPage.sourceUrl]);
                throw new Error(errorMsg);
            }
            return pageParser.fetchImagesUsedInDocument(content, webPage);
        }); 
    }

    initialHostName() {
        return util.extractHostName(this.state.chapterListUrl);
    }

    parserForWebPage(initialNostName, webPage) {
        if (util.extractHostName(webPage.sourceUrl) === initialNostName) {
            return this;
        }
        let pageParser = parserFactory.fetch(webPage.sourceUrl, webPage.rawDom);
        if (pageParser === undefined) {
            return this;
        }
        pageParser.copyState(this);
        return pageParser;
    }

    fetchImagesUsedInDocument(content, webPage) {
        let that = this;
        return ImageCollector.replaceHyperlinksToImagesWithImages(content, webPage.sourceUrl)
        .then(function (revisedContent) {
            that.imageCollector.findImagesUsedInDocument(revisedContent);
            return that.imageCollector.fetchImages(() => { }, webPage.sourceUrl);
        }).then(function () {
            that.updateLoadState(webPage);
        });
    }

    /**
    * default implementation
    * derivied classes can override if DOM has lots of elements not used in epub
    */
    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        util.removeElements(webPageDom.querySelectorAll("select, iframe"));
    }

    // Hook if need to chase hyperlinks in page to get all chapter content
    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return Promise.resolve(xhr.responseXML);
        });
    }

    updateLoadState(webPage) {
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_LOADED);
        ProgressBar.updateValue(1);
    }

    // Hook point, when need to do something when "Pack EPUB" pressed
    onStartCollecting() {
    }    

    fixupHyperlinksInEpubItems(epubItems) {
        let targets = this.sourceUrlToEpubItemUrl(epubItems);
        for(let item of epubItems) {
            for(let link of item.getHyperlinks().filter(this.isUnresolvedHyperlink)) {
                if (!this.hyperlinkToEpubItemUrl(link, targets)) {
                    this.makeHyperlinkAbsolute(link);
                }
            }
        }
    }

    sourceUrlToEpubItemUrl(epubItems) {
        let targets = new Map();
        for(let item of epubItems) {
            let key = util.normalizeUrlForCompare(item.sourceUrl);
            
            // Some source URLs may generate multiple epub items.
            // In that case, want FIRST epub item
            if (!targets.has(key)) {
                targets.set(key, util.makeRelative(item.getZipHref()));
            }
        }
        return targets;
    }

    isUnresolvedHyperlink(link) {
        let href = link.getAttribute("href");
        if (href == null) {
            return false;
        }
        return !href.startsWith("#") &&
            !href.startsWith("../Text/");
    }

    hyperlinkToEpubItemUrl(link, targets) {
        let key = util.normalizeUrlForCompare(link.href);
        let targetInEpub = targets.has(key);
        if (targetInEpub) {
            link.href = targets.get(key) + link.hash;
        }
        return targetInEpub;
    }

    makeHyperlinkAbsolute(link) {
        if (link.href !== link.getAttribute("href")) {
            link.href = link.href;
        }
    }
}
