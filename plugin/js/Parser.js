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
        return ((webPage.isIncludeable)
         && ((webPage.rawDom != null) || (webPage.error != null)));
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
            if (typeof(title) === "string") {
                let titleElement = webPage.rawDom.createElement("h1");
                titleElement.appendChild(webPage.rawDom.createTextNode(title.trim()));
                title = titleElement;
            }
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

    makePlacehoderEpubItem(webPage, epubItemIndex) {
        let temp = Parser.makeEmptyDocForContent();
        temp.content.textContent = chrome.i18n.getMessage("chapterPlaceholderMessage", 
            [webPage.sourceUrl, webPage.error]
        );
        util.convertPreTagToPTags(temp.dom, temp.content);
        return [new ChapterEpubItem(webPage, temp.content, epubItemIndex)];
    }

    /**
    * default implementation
    */
    static extractTitleDefault(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        return (title === null) ? dom.title : title.getAttribute("content");
    };

    extractTitleImpl(dom) {
        return Parser.extractTitleDefault(dom);
    };

    extractTitle(dom) {
        let title = this.extractTitleImpl(dom);
        if (title == null) {
            title = Parser.extractTitleDefault(dom);
        }
        if (title.textContent !== undefined) {
            title = title.textContent;
        }
        return title.trim();
    };

    /**
    * default implementation
    */
    extractAuthor(dom) {  // eslint-disable-line no-unused-vars
        return "<unknown>";
    }

    /**
    * default implementation, 
    * if not available, default to English
    */
    extractLanguage(dom) {
        // try jetpack tag
        let locale = dom.querySelector("meta[property='og:locale']");
        if (locale !== null) {
            return locale.getAttribute("content");
        }

        // try <html>'s lang attribute
        locale = dom.querySelector("html").getAttribute("lang");
        return (locale === null) ? "en" : locale;
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
        metaInfo.author = that.extractAuthor(dom).trim();
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
        let fileName = (title == null)  ? "web" : util.safeForFileName(title);
        if (util.isStringWhiteSpace(fileName)) {
            // title is probably not English, so just use it as is
            fileName = title;
        }
        return fileName;
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

        if (this.getInformationEpubItemChildNodes !== undefined) {
            epubItems.push(this.makeInformationEpubItem(this.state.firstPageDom));
            ++index;
        }

        for(let webPage of webPages.filter(c => this.isWebPagePackable(c))) {
            let newItems = (webPage.error == null)
                ? webPage.parser.webPageToEpubItems(webPage, index)
                : this.makePlacehoderEpubItem(webPage, index);
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
        let infoDiv = document.createElement("div");
        this.populateInfoDiv(infoDiv, dom);    
        let childNodes = [div, infoDiv];
        let chapter = {
            sourceUrl: this.state.chapterListUrl,
            title: titleText,
            newArch: null
        };
        return new ChapterEpubItem(chapter, {childNodes: childNodes}, 0);
    }

    populateInfoDiv(infoDiv, dom) {
        let sanitize = new Sanitize();
        for(let n of this.getInformationEpubItemChildNodes(dom)) {
            let clone = n.cloneNode(true);
            this.cleanInformationNode(clone);
            if (clone != null) {
                infoDiv.appendChild(sanitize.clean(clone));
            }
        }
        // this "page" doesn't go through image collector, so strip images
        util.removeChildElementsMatchingCss(infoDiv, "img");
    }

    cleanInformationNode(node) {     // eslint-disable-line no-unused-vars
        // do nothing, derived class overrides as required
    }

    // called when plugin has obtained the first web page
    onLoadFirstPage(url, firstPageDom) {
        let that = this;
        this.state.firstPageDom = firstPageDom;
        this.state.chapterListUrl = url;
        let chapterUrlsUI = new ChapterUrlsUI(this);
        this.userPreferences.setReadingListCheckbox(url);

        // returns promise, because may need to fetch additional pages to find list of chapters
        that.getChapterUrls(firstPageDom, chapterUrlsUI).then(function(chapters) {
            if (that.userPreferences.chaptersPageInChapterList.value) {
                chapters = that.addFirstPageUrlToWebPages(url, firstPageDom, chapters);
            }
            chapters = that.cleanWebPageUrls(chapters);
            that.userPreferences.readingList.deselectOldChapters(url, chapters);
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
            .filter(p => util.isUrl(p.sourceUrl))
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

        that.imageCollector.reset();
        that.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());

        let fetchFunc = (webPage) => this.fetchWebPageContent(webPage);

        return parserFactory.addParsersToPages(this, pagesToFetch).then(function () {
            var sequence = Promise.resolve();
            let simultanousFetchSize = parseInt(that.userPreferences.maxPagesToFetchSimultaneously.value);
            simultanousFetchSize = that.clampSimultanousFetchSize(simultanousFetchSize);
            for(let group of Parser.groupPagesToFetch(pagesToFetch, simultanousFetchSize)) {
                sequence = sequence.then(function () {
                    return Promise.all(group.map(fetchFunc));
                }); 
            }
            sequence = sequence.catch(function (err) {
                ErrorLog.log(err);
            });
            return sequence;
        }).catch(err => ErrorLog.log(err));
    }

    static groupPagesToFetch(webPages, blockSize) {
        let blocks = [];
        for(let i = 0; i < webPages.length; i += blockSize) {
            blocks.push(webPages.slice(i, i + blockSize));
        }
        return blocks;
    }

    fetchWebPageContent(webPage) {
        let that = this;
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
        let pageParser = webPage.parser;
        return pageParser.fetchChapter(webPage.sourceUrl).then(function (webPageDom) {
            webPage.rawDom = webPageDom;
            pageParser.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
            let content = pageParser.findContent(webPage.rawDom);
            if (content == null) {
                let errorMsg = chrome.i18n.getMessage("errorContentNotFound", [webPage.sourceUrl]);
                throw new Error(errorMsg);
            }
            return pageParser.fetchImagesUsedInDocument(content, webPage);
        }).catch(function (error) {
            if (that.userPreferences.skipChaptersThatFailFetch.value) {
                ErrorLog.log(error);
                webPage.error = error;
            } else {
                webPage.isIncludeable = false;
                throw error;
            }
        }); 
    }

    fetchImagesUsedInDocument(content, webPage) {
        let that = this;
        return this.imageCollector.preprocessImageTags(content, webPage.sourceUrl)
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

    updateReadingList() {
        this.userPreferences.readingList.update(
            this.state.chapterListUrl,
            [...this.state.webPages.values()]
        );
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
            link.href = link.href;       // eslint-disable-line no-self-assign
        }
    }

    disabled() {
        return null;
    }

    /**
     * limit number of pages to fetch at once 
     * ignoing user preference.
     * Some sites can't handle high load.  e.g. Comrademao
     * @param {any} fetchSize
     */
    clampSimultanousFetchSize(fetchSize) {
        return fetchSize;
    }

    static makeEmptyDocForContent() {
        let dom = document.implementation.createHTMLDocument("");
        let content = dom.createElement("div");
        content.className = Parser.WEB_TO_EPUB_CLASS_NAME;
        dom.body.appendChild(content);
        return {
            dom: dom,
            content: content 
        };
    }

    static findConstrutedContent(dom) {
        return dom.querySelector("div." + Parser.WEB_TO_EPUB_CLASS_NAME);
    }

    getChapterUrlsFromMultipleTocPages(dom, extractPartialChapterList, getUrlsOfTocPages, chapterUrlsUI)  {
        let chapters = extractPartialChapterList(dom);
        chapterUrlsUI.showTocProgress(chapters);
        let tocPageUrls = getUrlsOfTocPages(dom);
        return Parser.fetchAllTocPages(extractPartialChapterList, chapters, tocPageUrls, 0, chapterUrlsUI);
    }

    static fetchAllTocPages(extractPartialChapterList, chapters, tocPageUrls, index, chapterUrlsUI)
    {
        if (tocPageUrls.length <= index) {
            return Promise.resolve(chapters);
        }
        return HttpClient.wrapFetch(tocPageUrls[index]).then(function (xhr) {
            let partialList = extractPartialChapterList(xhr.responseXML);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            return Parser.fetchAllTocPages(extractPartialChapterList, chapters, tocPageUrls, index + 1, chapterUrlsUI);
        });
    }
}

Parser.WEB_TO_EPUB_CLASS_NAME = "webToEpubContent";
