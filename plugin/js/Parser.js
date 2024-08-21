/*
  Base class that all parsers build from.
*/
"use strict";

/**
 * For sites that have multiple chapters per web page, this can minimize HTTP calls
 */
class FetchCache {
    constructor() {
        this.path = null;
        this.dom = null;
    }

    async fetch(url) {
        if  (!this.inCache(url)) {
            this.dom = (await HttpClient.wrapFetch(url)).responseXML;
            this.path = new URL(url).pathname;
        }
        return this.dom.cloneNode(true);
    }

    inCache(url) {
        return (((new URL(url).pathname) === this.path) 
        && (this.dom !== null));
    }
}

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
        this.minimumThrottle = null;
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
        let title = this.findChapterTitle(webPage.rawDom, webPage);
        if (title != null) {
            if (title instanceof HTMLElement) {
                title = title.textContent;
            }
            if (!this.titleAlreadyPresent(title, content)) {
                let titleElement = webPage.rawDom.createElement("h1");
                titleElement.appendChild(webPage.rawDom.createTextNode(title.trim()));
                content.insertBefore(titleElement, content.firstChild);
            }
        };
    }

    titleAlreadyPresent(title, content) {
        let existingTitle = content.querySelector("h1, h2, h3, h4, h5, h6");
        return (existingTitle != null)
            && (title.trim() === existingTitle.textContent.trim());
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
        let temp = Parser.makeEmptyDocForContent(webPage.sourceUrl);
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
    * default implementation, 
    * if not available, return ''
    */
    extractSubject(dom) {   // eslint-disable-line no-unused-vars
        return "";
    }
    extractDescription(dom) {   // eslint-disable-line no-unused-vars
        return "";
    }

    /**
    * default implementation, Derived classes will override
    */
    extractSeriesInfo(dom, metaInfo) {  // eslint-disable-line no-unused-vars
    }

    getEpubMetaInfo(dom, useFullTitle){
        let that = this;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = dom.baseURI;
        metaInfo.title = that.extractTitle(dom);
        metaInfo.author = that.extractAuthor(dom).trim();
        metaInfo.language = that.extractLanguage(dom);
        metaInfo.fileName = that.makeSaveAsFileNameWithoutExtension(metaInfo.title, useFullTitle);
        metaInfo.subject = that.extractSubject(dom);
        metaInfo.description = that.extractDescription(dom);
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

    makeSaveAsFileNameWithoutExtension(title, useFullTitle) {
        let maxFiileNameLength = useFullTitle ? 512 : 20;
        let fileName = (title == null)  ? "web" : util.safeForFileName(title, maxFiileNameLength);
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

        if (this.userPreferences.addInformationPage.value &&
            this.getInformationEpubItemChildNodes !== undefined) {
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
        for(let n of this.getInformationEpubItemChildNodes(dom).filter(n => n != null)) {
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

    async fetchWebPages() {
        let that = this;

        let pagesToFetch = [...this.state.webPages.values()].filter(c => c.isIncludeable);
        if (pagesToFetch.length === 0) {
            return Promise.reject(new Error("No chapters found."));
        }

        this.setUiToShowLoadingProgress(pagesToFetch.length);

        that.imageCollector.reset();
        that.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());

        await this.addParsersToPages(pagesToFetch);
        let index = 0;
        try
        {
            let group = this.groupPagesToFetch(pagesToFetch, index);
            while (0 < group.length) {
                await Promise.all(group.map(async (webPage) => this.fetchWebPageContent(webPage)));
                index += group.length;
                group = this.groupPagesToFetch(pagesToFetch, index);
            }
        }
        catch (err)
        {
            ErrorLog.log(err);
        }
    }

    async addParsersToPages(pagesToFetch) {
        parserFactory.addParsersToPages(this, pagesToFetch);
    }

    groupPagesToFetch(webPages, index) {
        let blockSize = parseInt(this.userPreferences.maxPagesToFetchSimultaneously.value);
        blockSize = this.clampSimultanousFetchSize(blockSize);
        return webPages.slice(index, index + blockSize);
    }

    async fetchWebPageContent(webPage) {
        let that = this;
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_SLEEPING);
        await this.rateLimitDelay();
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
        let pageParser = webPage.parser;
        return pageParser.fetchChapter(webPage.sourceUrl).then(function (webPageDom) {
            delete webPage.error;
            webPage.rawDom = webPageDom;
            pageParser.preprocessRawDom(webPageDom);
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
    * derivied classes override if need to do something to fetched DOM before
    * normal processing steps
    */
    preprocessRawDom(webPageDom) { // eslint-disable-line no-unused-vars
    }

    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        util.removeElements(webPageDom.querySelectorAll("select, iframe"));
    }

    // Hook if need to chase hyperlinks in page to get all chapter content
    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url)).responseXML;
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

    tagAuthorNotes(elements) {
        for(let e of elements) {
            e.classList.add("webToEpub-author-note");
        }
    }

    tagAuthorNotesBySelector(element, selector) {
        let notes = element.querySelectorAll(selector);
        if (this.userPreferences.removeAuthorNotes.value) {
            util.removeElements(notes);
        } else {
            this.tagAuthorNotes(notes);
        }
    }

    static makeEmptyDocForContent(baseUrl) {
        let dom = document.implementation.createHTMLDocument("");
        if (baseUrl != null) {
            util.setBaseTag(baseUrl, dom);        
        }
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

    async getChapterUrlsFromMultipleTocPages(dom, extractPartialChapterList, getUrlsOfTocPages, chapterUrlsUI)  {
        let chapters = extractPartialChapterList(dom);
        let urlsOfTocPages = getUrlsOfTocPages(dom);
        return await this.getChaptersFromAllTocPages(chapters, extractPartialChapterList, urlsOfTocPages, chapterUrlsUI);
    }

    getRateLimit()
    {
        if (this.userPreferences.manualDelayPerChapter.value == "simulate_reading")
        {
            return this.userPreferences.manualDelayPerChapter.value;
        }
        let manualDelayPerChapterValue = parseInt(this.userPreferences.manualDelayPerChapter.value);

        if (!this.userPreferences.overrideMinimumDelay.value)
        {
            return Math.max(this.minimumThrottle, manualDelayPerChapterValue);
        }
        return manualDelayPerChapterValue;
    }

    async rateLimitDelay() {
        let manualDelayPerChapterValue = this.getRateLimit();
        manualDelayPerChapterValue = (manualDelayPerChapterValue == "simulate_reading" )? util.randomInteger(420000,900000): manualDelayPerChapterValue;
        await util.sleep(manualDelayPerChapterValue);
    }

    async getChaptersFromAllTocPages(chapters, extractPartialChapterList, urlsOfTocPages, chapterUrlsUI)  {
        if (0 < chapters.length) {
            chapterUrlsUI.showTocProgress(chapters);
        }
        for(let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let newDom = (await HttpClient.wrapFetch(url)).responseXML;
            let partialList = extractPartialChapterList(newDom);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    async walkTocPages(dom, chaptersFromDom, nextTocPageUrl, chapterUrlsUI) {
        let chapters = chaptersFromDom(dom);
        chapterUrlsUI.showTocProgress(chapters);
        let url = nextTocPageUrl(dom, chapters, chapters);
        while (url != null) {
            await this.rateLimitDelay();
            dom = (await HttpClient.wrapFetch(url)).responseXML;
            let partialList = chaptersFromDom(dom);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            url = nextTocPageUrl(dom, chapters, partialList);
        }
        return chapters;
    }

    moveFootnotes(dom, content, footnotes) {
        if (0 < footnotes.length) {
            let list = dom.createElement("ol");
            for(let f of footnotes) {
                let item = dom.createElement("li");
                f.removeAttribute("style");
                item.appendChild(f);
                list.appendChild(item);
            }
            let header = dom.createElement("h2");
            header.appendChild(dom.createTextNode("Footnotes"));
            content.appendChild(header);
            content.appendChild(list);
        }
    }

    async walkPagesOfChapter(url, moreChapterTextUrl) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let count = 2;
        let nextUrl = moreChapterTextUrl(dom, url, count);
        let oldContent = this.findContent(dom);
        while(nextUrl != null) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let newContent = this.findContent(nextDom);
            util.moveChildElements(newContent, oldContent);
            nextUrl = moreChapterTextUrl(nextDom, url, ++count);
        }
        return dom;
    }    
}

Parser.WEB_TO_EPUB_CLASS_NAME = "webToEpubContent";
