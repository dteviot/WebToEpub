/*
  Parses "Full Text" web page on www.baka-tsuki.org
*/
"use strict";

parserFactory.registerManualSelect(
    "Baka-Tsuki Full Text Page", 
    () => new BakaTsukiParser(new BakaTsukiImageCollector())
);

class BakaTsukiImageCollector extends ImageCollector {
    constructor() {
        super();
        this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
    }

    onUserPreferencesUpdate(userPreferences) {
        super.onUserPreferencesUpdate(userPreferences);
        if (userPreferences.highestResolutionImages.value) {
            this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
        } else {
            this.selectImageUrlFromImagePage = this.getReducedResImageUrlFromImagePage;
        }
    }

    getReducedResImageUrlFromImagePage(dom) {
        let img = dom.querySelector("div.fullImageLink img");
        return (img === null) ? null : util.resolveRelativeUrl(dom.baseURI, img.src);
    }

    getHighestResImageUrlFromImagePage(dom) {
        let link = dom.querySelector("div.fullMedia a");
        return (link === null) ? null : link.href;
    }
}

//==============================================================

class BakaTsukiParser extends Parser {
    constructor(imageCollector) {
        super(imageCollector);
        this.state.firstPageDom = null;
    }

    static register() {
        parserFactory.reregister("baka-tsuki.org", () => new BakaTsukiParser(new BakaTsukiImageCollector()));      
    }

    rebuildImagesToFetch() {
        // needed with Baka-Tsuki, in case user hits "Build EPUB" a second time
        this.imageCollector.reset();
        let content = this.findContent(this.state.firstPageDom).cloneNode(true);
        this.removeUnwantedElementsFromContentElement(content);
        this.imageCollector.findImagesUsedInDocument(content);
        this.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());
    }

    populateImageTable() {
        let enable = document.getElementById("coverFromUrlCheckboxInput").checked;
        CoverImageUI.onCoverFromUrlClick(enable, this.imageCollector.imageInfoList);
    }

    static splitContentOnHeadingTags(content) {
        let items = [];
        let nodesInItem = [];
        for (let i = 0; i < content.childNodes.length; ++i) {
            let node = util.wrapRawTextNode(content.childNodes[i]);
            if (BakaTsukiParser.isChapterStart(node)) {
                BakaTsukiParser.appendToItems(items, nodesInItem);
                nodesInItem = [];
            }
            nodesInItem.push(node);
        }
        BakaTsukiParser.appendToItems(items, nodesInItem);
        return items;
    }

    static isChapterStart(node) {
        return util.isHeaderTag(node);
    }

    static appendToItems(items, nodesInItem) {
        BakaTsukiParser.removeTrailingWhiteSpace(nodesInItem);
        if (0 < nodesInItem.length) {
            items.push({ nodes: nodesInItem});
        }
    }

    static removeTrailingWhiteSpace(nodesInItem) {
        let i = nodesInItem.length - 1;
        while ((0 <= i) && util.isElementWhiteSpace(nodesInItem[i])) {
            nodesInItem.pop();
            --i;
        }
    }

    static itemsToEpubItems(items, startAt, sourceUrl) {
        // ToDo: when have image files, this will probably need to be redone.
        let index = startAt;
        return items.map(function(item) {
            let epubItem = new EpubItem(sourceUrl);
            epubItem.setIndex(index);
            epubItem.nodes = item.nodes;
            ++index;
            return epubItem;
        });
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.firstHeading");
    }

    extractSeriesInfo(dom, metaInfo) {
        // assumes <title> element text is "<series name>:Volume <series index> - Baka Tsuki"
        let title = dom.title.trim();
        let splitIndex = title.indexOf(":");
        if (0 < splitIndex) {
            metaInfo.seriesName = title.substring(0, splitIndex);
            metaInfo.seriesIndex = this.extractVolumeIndex(title.substring(splitIndex));
        }
    }

    extractVolumeIndex(volumeString) {
        let volumeIndex = "";
        for (let ch of volumeString) {
            if (("0" <= ch) && (ch <= "9")) {
                volumeIndex += ch;
            }
        }
        return volumeIndex;
    }

    findContent(dom) {
        return dom.querySelector("div.mw-content-ltr");
    }

    onLoadFirstPage(url, firstPageDom) {
        this.state.firstPageDom = firstPageDom;
        this.state.chapterListUrl = url;

        let content = this.findContent(firstPageDom).cloneNode(true);
        this.removeUnwantedElementsFromContentElement(content);
        this.imageCollector.findImagesUsedInDocument(content);
        this.populateImageTable();
    }

    populateUIImpl() {
        document.getElementById("highestResolutionImagesRow").hidden = false;
        document.getElementById("unSuperScriptAlternateTranslations").hidden = false; 
        document.getElementById("imageSection").hidden = false;
        document.getElementById("outputSection").hidden = true;
        document.getElementById("translatorRow").hidden = false;
        document.getElementById("fileAuthorAsRow").hidden = false;
        document.getElementById("coverFromUrlCheckboxInput").onclick = this.populateImageTable.bind(this);
    }

    epubItemSupplier() {
        let content = this.findContent(this.state.firstPageDom).cloneNode(true);
        this.removeUnwantedElementsFromContentElement(content);
        util.fixBlockTagsNestedInInlineTags(content);
        this.replaceImageTags(content);
        util.removeUnusedHeadingLevels(content);
        if (this.userPreferences.unSuperScriptAlternateTranslations.value) {
            BakaTsukiParser.unSuperScriptAlternateTranslations(content);
        }
        util.prepForConvertToXhtml(content);
        util.removeEmptyDivElements(content);
        let epubItems = this.splitContentIntoEpubItems(content, this.state.firstPageDom.baseURI);
        BakaTsukiParser.fixupInternalHyperLinks(epubItems);
        return new EpubItemSupplier(this, epubItems, this.imageCollector);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeScriptableElements(element);

        // discard table of contents (will generate one from tags later)
        util.removeElements(element.querySelectorAll("div#toc"));

        // remove "Jump Up" text that appears beside the up arrow from translator notes
        util.removeElements(element.querySelectorAll("span.cite-accessibility-label"));

        util.removeComments(element);
        BakaTsukiParser.removeUnwantedTable(element);

        // hyperlinks that allow editing text
        util.removeElements(element.querySelectorAll("span.mw-editsection"));
    }

    // There's a table at end of content, with links to other stories on Baka Tsuki.
    // It's not wanted in the EPUB
    static removeUnwantedTable(element) {
        // sometimes the target table has other tables nested in it.
        let tables = [...element.querySelectorAll("table")];
        if (0 < tables.length) {
            let endTable = tables[tables.length - 1];
            let node = endTable;
            while (node.parentNode != null) {
                node = node.parentNode;
                if (node.tagName === "TABLE") {
                    endTable = node;
                }
            }
            if (BakaTsukiParser.isTableContainsHyperLinks(endTable)) {
                endTable.remove();
            }
        }
    }

    static isTableContainsHyperLinks(tableElement) {
        return tableElement.querySelector("a") !== null;
    }

    replaceImageTags(element) {
        BakaTsukiParser.stripGalleryBox(element);
        this.imageCollector.replaceImageTags(element);
    }

    // remove gallery text and move images out of the gallery box so images can take full screen.
    static stripGalleryBox(element) {

        let galleryBoxes = [...element.querySelectorAll("li.gallerybox")];
        if (0 < galleryBoxes.length) {
            BakaTsukiParser.removeTextBeforeGallery(galleryBoxes[0].parentNode);        
        }

        // move images out of the <ul> gallery
        let garbage = new Set();
        for (let listItem of galleryBoxes) {
            util.removeElements(listItem.querySelectorAll("div.gallerytext"));

            let gallery = listItem.parentNode;
            garbage.add(gallery);
            gallery.parentNode.insertBefore(listItem.firstElementChild, gallery);
        }

        // throw away rest of gallery  (note sometimes there are multiple galleries)
        for (let node of garbage) {
            node.remove();
        }
    }

    static removeTextBeforeGallery(gallery) {
        let previous = gallery.previousElementSibling; 
        while ((previous != null) && !util.isHeaderTag(previous)) {
            let temp = previous.previousElementSibling;
            if (previous.tagName.toLowerCase() === "p") {
                previous.remove();
            }
            previous = temp;
        }
    }

    splitContentIntoEpubItems(content, sourceUrl) {
        this.flattenContent(content);
        let items = BakaTsukiParser.splitContentOnHeadingTags(content);
        items = this.consolidateItems(items);
        items = this.discardItemsWithNoVisibleContent(items);
        return BakaTsukiParser.itemsToEpubItems(items, 0, sourceUrl);
    }

    flattenContent(content) {
        // most pages have all header tags as immediate children of the content element
        // where this is not the case, flatten them so that they are.
        for (let i = 0; i < content.childNodes.length; ++i) {
            let node = content.childNodes[i];
            if (this.nodeNeedsToBeFlattened(node)) {
                util.flattenNode(node);
                --i;
            }
        }
    }

    nodeNeedsToBeFlattened(node) {
        let numHeaders = this.numberOfHeaderTags(node);
        return ((1 < numHeaders) || ((numHeaders === 1) && !BakaTsukiParser.isChapterStart(node)));
    }

    numberOfHeaderTags(node) {
        let walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT); 
        let count = 0;
        do {
            if (BakaTsukiParser.isChapterStart(walker.currentNode)) {
                ++count;
            }
        } while (walker.nextNode());
        return count;
    }

    // If an item only holds a heading element, combine with following epubItem.
    // e.g. We're dealing with <h1> followed by <h2>
    consolidateItems(items) {
        let newItems = [ items[items.length - 1] ];
        let i = items.length - 2;
        while (0 <= i) {
            let item = items[i];
            if (item.nodes.length === 1) {
                newItems[0].nodes.unshift(item.nodes[0]);
            } else {
                newItems.unshift(item);
            }
            --i;
        }
        return newItems;
    }

    discardItemsWithNoVisibleContent(items) {
        return items.filter(item => this.hasVisibleContent(item.nodes));
    }

    hasVisibleContent(nodes) {
        for (let node of nodes) {
            if (!util.isElementWhiteSpace(node)) {
                return true;
            }
        }

        // if get here, no visible content
        return false;
    }

    static fixupInternalHyperLinks(epubItems) {
        let targets = BakaTsukiParser.findLinkTargets(epubItems);
        BakaTsukiParser.findAndFixHyperLinks(epubItems, targets);
    }

    static findLinkTargets(epubItems) {
        let targets = new Map();
        BakaTsukiParser.walkEpubItemsWithElements(
            epubItems, 
            targets,
            BakaTsukiParser.recordTarget
        );
        return targets;
    }

    static findAndFixHyperLinks(epubItems, targets) {
        BakaTsukiParser.walkEpubItemsWithElements(
            epubItems, 
            targets,
            BakaTsukiParser.fixHyperlink
        );
    }

    static walkEpubItemsWithElements(epubItems, targets, processFoundNode) {
        for (let epubItem of epubItems) {
            for (let element of epubItem.nodes.filter(e => e.nodeType === Node.ELEMENT_NODE)) {
                let walker = document.createTreeWalker(
                    element, 
                    NodeFilter.SHOW_ELEMENT
                );
                
                // assume first header tag we find is title of the chapter.
                if (util.isHeaderTag(element) && (epubItem.chapterTitle === null)) {
                    epubItem.chapterTitle = element.textContent;
                }
                do {
                    processFoundNode(walker.currentNode, targets, util.makeRelative(epubItem.getZipHref()));
                } while (walker.nextNode());
            }
        }
    }

    static unSuperScriptAlternateTranslations(element) {
        for (let s of util.getElements(element, "span", s => BakaTsukiParser.isPsudoSuperScriptSpan(s))) {
            let sibling = s.nextSibling;
            if ((sibling !== null) && (sibling.tagName.toLowerCase() === "span")) {
                sibling.textContent = sibling.textContent + " (" + s.textContent + ")";
                s.remove();
            }
        }
    }

    static isPsudoSuperScriptSpan(element) {
        let top = element.style.top;
        return (top != null) && (0 < top.length) && (top[0] === "-");
    }

    static recordTarget(node, targets, zipHref) {
        if (node.id != "") {
            targets.set(node.id, zipHref);
        }
    }

    static fixHyperlink(node, targets, unused) { // eslint-disable-line no-unused-vars
        if (node.tagName === "A") {
            let targetId = util.extractHashFromUri(node.href);
            let targetZipHref = targets.get(targetId);
            if (targetZipHref != null) {
                node.href = targetZipHref + "#" + targetId;
            }
        }
    }

    onFetchImagesClicked() {
        if (0 == this.imageCollector.imageInfoList.length) {
            ErrorLog.showErrorMessage(UIText.Error.noImagesFound);
        } else {
            this.fetchContent();
        }
    }

    fetchContent() {
        this.rebuildImagesToFetch();
        this.setUiToShowLoadingProgress(this.imageCollector.numberOfImagesToFetch());
        return this.imageCollector.fetchImages(() => this.updateProgressBarOneStep(), this.state.firstPageDom.baseURI)
            .then(function() {
                main.getPackEpubButton().disabled = false;
            }).catch(function(err) {
                ErrorLog.log(err);
            });
    }

    updateProgressBarOneStep() {
        ProgressBar.updateValue(1);
    }
}

//==============================================================

BakaTsukiParser.register();
