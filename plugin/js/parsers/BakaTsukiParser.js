/*
  Parses files on www.baka-tsuki.org
*/
"use strict";

parserFactory.register("www.baka-tsuki.org", function() { 
    return new BakaTsukiParser(new BakaTsukiImageCollector()) 
});

class BakaTsukiImageCollector extends ImageCollector {
    constructor() {
        super();
        this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
    }

    onUserPreferencesUpdate(userPreferences) {
        super.onUserPreferencesUpdate(userPreferences);
        if (userPreferences.higestResolutionImages) {
            this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
        } else {
            this.selectImageUrlFromImagePage = this.getReducedResImageUrlFromImagePage
        };
    }

    getReducedResImageUrlFromImagePage(dom) {
        let div = util.getElement(dom, "div", e => (e.className === "fullImageLink"));
        if (div === null) {
            return null;
        } else {
            let img = util.getElement(div, "img");
            return (img === null) ? null : util.resolveRelativeUrl(dom.baseURI, img.src);
        }
    }

    getHighestResImageUrlFromImagePage(dom) {
        let div = util.getElement(dom, "div", e => (e.className === "fullMedia"));
        if (div === null) {
            return null;
        } else {
            let link = util.getElement(div, "a");
            return (link === null) ? null : link.href;
        }
    }
}

//==============================================================

class BakaTsukiParser extends Parser{
    constructor(imageCollector) {
        super(imageCollector);
        this.firstPageDom = null;
    }

    rebuildImagesToFetch() {
        // needed with Baka-Tsuki, in case user hits "Build EPUB" a second time
        let that = this;
        that.imageCollector.reset();
        let content = that.findContent(that.firstPageDom).cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        that.imageCollector.findImagesUsedInDocument(content);
        that.imageCollector.setCoverImageUrl(CoverImageUI.getCoverImageUrl());
    }

    populateImageTable() {
        let enable = document.getElementById("coverFromUrlCheckboxInput").checked;
        CoverImageUI.onCoverFromUrlClick(enable, this.imageCollector.imageInfoList);
    }

    static splitContentOnHeadingTags(content, sourceUrl) {
        let epubItems = [];
        let elementsInItem = [];
        for(let i = 0; i < content.childNodes.length; ++i) {
            let node = util.wrapRawTextNode(content.childNodes[i]);
            if (BakaTsukiParser.isChapterStart(node)) {
                BakaTsukiParser.appendToEpubItems(epubItems, elementsInItem, sourceUrl);
                elementsInItem = [];
            };
            elementsInItem.push(node);
        };
        BakaTsukiParser.appendToEpubItems(epubItems, elementsInItem, sourceUrl);
        return epubItems;
    }

    static isChapterStart(node) {
        return util.isHeaderTag(node);
    }

    static appendToEpubItems(epubItems, elementsInItem, sourceUrl) {
        BakaTsukiParser.removeTrailingWhiteSpace(elementsInItem);
        if (0 < elementsInItem.length) {
            let epubItem = new EpubItem(sourceUrl);
            epubItem.elements = elementsInItem;
            epubItems.push(epubItem);
        };
    }

    static removeTrailingWhiteSpace(elementsInItem) {
        let i = elementsInItem.length - 1;
        while ((0 <= i) && util.isElementWhiteSpace(elementsInItem[i])) {
            elementsInItem.pop();
            --i;
        };
    }

    static indexEpubItems(epubItems, startAt) {
        // ToDo: when have image files, this will probably need to be redone.
        let index = startAt;
        for(let epubItem of  epubItems) {
            epubItem.setIndex(index);
            ++index;
        };
    }
}

BakaTsukiParser.prototype.extractTitle = function(dom) {
    return this.getElement(dom, "h1", e => (e.className === "firstHeading") ).textContent.trim();
};

BakaTsukiParser.prototype.extractLanguage = function(dom) {
    return this.getElement(dom, "html").getAttribute("lang");
};

BakaTsukiParser.prototype.extractSeriesInfo = function(dom, metaInfo) {
    // assumes <title> element text is "<series name>:Volume <series index> - Baka Tsuki"
    let that = this;
    let title = util.getElement(dom, "title").innerText.trim();
    let splitIndex = title.indexOf(":");
    if (0 < splitIndex) {
        metaInfo.seriesName = title.substring(0, splitIndex);
        metaInfo.seriesIndex = that.extractVolumeIndex(title.substring(splitIndex));
    };
}

BakaTsukiParser.prototype.extractVolumeIndex = function(volumeString) {
    let volumeIndex = "";
    for(let ch of volumeString) {
        if (("0" <= ch) && (ch <= "9")) {
            volumeIndex += ch;
        };
    };    
    return volumeIndex;
}

// find the node(s) holding the story content
BakaTsukiParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className === "mw-content-ltr") );
};

// called when plugin has obtained the first web page
BakaTsukiParser.prototype.onLoadFirstPage = function (url, firstPageDom) {
    let that = this;
    that.firstPageDom = firstPageDom;

    let content = that.findContent(that.firstPageDom).cloneNode(true);
    that.removeUnwantedElementsFromContentElement(content);
    that.imageCollector.findImagesUsedInDocument(content);
    that.populateImageTable();
};

BakaTsukiParser.prototype.populateUI = function (dom) {  // eslint-disable-line no-unused-vars
    document.getElementById("higestResolutionImagesRow").hidden = false; 
    document.getElementById("imageSection").hidden = false;
    document.getElementById("outputSection").hidden = true;
    document.getElementById("translatorRow").hidden = false;
    document.getElementById("fileAuthorAsRow").hidden = false;
    this.getFetchContentButton().onclick = this.onFetchImagesClicked.bind(this);
    document.getElementById("coverFromUrlCheckboxInput").onclick = this.populateImageTable.bind(this);
};

BakaTsukiParser.prototype.epubItemSupplier = function () {
    let that = this;
    let content = that.findContent(that.firstPageDom).cloneNode(true);
    that.removeUnwantedElementsFromContentElement(content);
    util.fixBlockTagsNestedInInlineTags(content);
    that.replaceImageTags(content);
    util.removeUnusedHeadingLevels(content);
    util.prepForConvertToXhtml(content);
    util.removeEmptyDivElements(content);
    let epubItems = that.splitContentIntoSections(content, that.firstPageDom.baseURI);
    that.fixupInternalHyperLinks(epubItems);
    return new EpubItemSupplier(that, epubItems, that.imageCollector);
}

BakaTsukiParser.prototype.removeUnwantedElementsFromContentElement = function (element) {
    let that = this;
    util.removeScriptableElements(element);

    // discard table of contents (will generate one from tags later)
    util.removeElements(that.getElements(element, "div", e => (e.id === "toc")));

    // remove "Jump Up" text that appears beside the up arrow from translator notes
    util.removeElements(that.getElements(element, "span", e => (e.className === "cite-accessibility-label")));

    util.removeUnneededIds(element);

    util.removeComments(element);
    that.removeUnwantedTable(element);

    // hyperlinks that allow editing text
    util.removeElements(that.getElements(element, "span", e => (e.className === "mw-editsection")));
};

// There's a table at end of content, with links to other stories on Baka Tsuki.
// It's not wanted in the EPUB
BakaTsukiParser.prototype.removeUnwantedTable = function (element) {
    // sometimes the target table has other tables nested in it.
    let that = this;
    let tables = that.getElements(element, "table");
    if (0 < tables.length) {
        let endTable = tables[tables.length - 1];
        let node = endTable;
        while (node.parentNode != null) {
            node = node.parentNode;
            if (node.tagName === "TABLE") {
                endTable = node;
            };
        };
        if (that.isTableContainsHyperLinks(endTable)) {
            util.removeNode(endTable);
        };
    }
}

BakaTsukiParser.prototype.isTableContainsHyperLinks = function(tableElement) {
    return util.getElement(tableElement, "a") !== null;
}

BakaTsukiParser.prototype.replaceImageTags = function (element) {
    let that = this;
    that.stripGalleryBox(element);
    that.imageCollector.replaceImageTags(element);
}

// remove gallery text and move images out of the gallery box so images can take full screen.
BakaTsukiParser.prototype.stripGalleryBox = function (element) {
    let that = this;

    // move images out of the <ul> gallery
    let garbage = new Set();
    for(let listItem of util.getElements(element, "li", e => (e.className === "gallerybox"))) {
        util.removeElements(that.getElements(listItem, "div", e => (e.className === "gallerytext")));

        let gallery = listItem.parentNode;
        garbage.add(gallery);
        gallery.parentNode.insertBefore(listItem.firstChild, gallery);
    }

    // throw away rest of gallery  (note sometimes there are multiple galleries)
    for(let node of garbage) {
        util.removeNode(node);
    }
}

BakaTsukiParser.prototype.splitContentIntoSections = function (content, sourceUrl) {
    let that = this;
    that.flattenContent(content);
    let epubItems = BakaTsukiParser.splitContentOnHeadingTags(content, sourceUrl);
    epubItems = that.consolidateEpubItems(epubItems);
    epubItems = that.discardEpubItemsWithNoVisibleContent(epubItems);
    BakaTsukiParser.indexEpubItems(epubItems, 0);
    return epubItems;
}

BakaTsukiParser.prototype.flattenContent = function (content) {
    // most pages have all header tags as immediate children of the content element
    // where this is not the case, flatten them so that they are.
    let that = this;
    for(let i = 0; i < content.childNodes.length; ++i) {
        let node = content.childNodes[i];
        if (that.nodeNeedsToBeFlattened(node)) {
            for(let j = node.childNodes.length - 1; 0 <= j; --j) {
                that.insertAfter(node, node.childNodes[j]);
            }
            util.removeNode(node);
            --i;
        }
    }
}

BakaTsukiParser.prototype.nodeNeedsToBeFlattened = function (node) {
    let that = this;
    let numHeaders = that.numberOfHeaderTags(node);
    return ((1 < numHeaders) || ((numHeaders === 1) && !BakaTsukiParser.isChapterStart(node)));
}

BakaTsukiParser.prototype.numberOfHeaderTags = function (node) {
    let walker = document.createTreeWalker(node); 
    let count = 0;
    do {
        if (BakaTsukiParser.isChapterStart(walker.currentNode)) {
            ++count;
        };
    } while (walker.nextNode());
    return count;
}

BakaTsukiParser.prototype.insertAfter = function (atNode, nodeToInsert) {
    let nextSibling = atNode.nextSibling;
    if (nextSibling != null) {
        atNode.parentNode.insertBefore(nodeToInsert, nextSibling);
    } else {
        atNode.parentNode.appendChild(nodeToInsert);
    }
}

// If a epubItem only holds a heading element, combine with following epubItem.
// e.g. We're dealing with <h1> followed by <h2>
BakaTsukiParser.prototype.consolidateEpubItems = function (epubItems) {
    let newEpubItems = [ epubItems[epubItems.length - 1] ];
    let i = epubItems.length - 2;
    while (0 <= i) {
        let epubItem = epubItems[i];
        if (epubItem.elements.length === 1) {
            newEpubItems[0].elements.unshift(epubItem.elements[0]);
        } else {
            newEpubItems.unshift(epubItem);
        }
        --i;
    }
    return newEpubItems;
}

BakaTsukiParser.prototype.discardEpubItemsWithNoVisibleContent = function(epubItems) {
    let that = this;
    return epubItems.filter(item => that.hasVisibleContent(item.elements));
}

BakaTsukiParser.prototype.hasVisibleContent = function(elements) {
    for (let element of elements) {
        if (!util.isElementWhiteSpace(element)) {
            return true;
        }
    }

    // if get here, no visible content
    return false;
}

BakaTsukiParser.prototype.fixupInternalHyperLinks = function(epubItems) {
    let targets = this.findLinkTargets(epubItems);
    this.findAndFixHyperLinks(epubItems, targets);
}

BakaTsukiParser.prototype.findLinkTargets = function(epubItems) {
    let that = this;
    let targets = new Map();
    that.walkEpubItemsWithElements(
        epubItems, 
        targets,
        that.recordTarget
    );
    return targets;
}

BakaTsukiParser.prototype.findAndFixHyperLinks = function(epubItems, targets) {
    let that = this;
    that.walkEpubItemsWithElements(
        epubItems, 
        targets,
        that.fixHyperlink
    );
}

BakaTsukiParser.prototype.walkEpubItemsWithElements = function(epubItems, targets, processFoundNode) {
    let that = this;
    for(let epubItem of epubItems) {
        for(let element of epubItem.elements) {
            let walker = document.createTreeWalker(
                element, 
                NodeFilter.SHOW_ELEMENT
            );
            
            // assume first header tag we find is title of the chapter.
            if(util.isHeaderTag(element) && (epubItem.chapterTitle === null)){
                epubItem.chapterTitle = element.textContent;
            }
            do {
                processFoundNode.apply(that, [walker.currentNode, targets, util.makeRelative(epubItem.getZipHref())]);
            } while (walker.nextNode());
        };
    };
}

BakaTsukiParser.prototype.recordTarget = function(node, targets, zipHref) {
    if (node.id != "") {
        targets.set(node.id, zipHref);
    };
}

BakaTsukiParser.prototype.fixHyperlink = function(node, targets, unused) { // eslint-disable-line no-unused-vars
    if (node.tagName === "A") {
        let targetId = util.extractHashFromUri(node.href);
        let targetZipHref = targets.get(targetId);
        if (targetZipHref != null) {
            node.href = targetZipHref + "#" + targetId;
        }
    }
}

BakaTsukiParser.prototype.onFetchImagesClicked = function () {
    let that = this;
    if (0 == that.imageCollector.imageInfoList.length) {
        window.showErrorMessage(chrome.i18n.getMessage("noImagesFound"));
    } else {
        that.getFetchContentButton().disabled = true;
        that.fetchContent();
    }
}

BakaTsukiParser.prototype.fetchContent = function () {
    let that = this;
    that.rebuildImagesToFetch();
    this.setUiToShowLoadingProgress(that.imageCollector.numberOfImagesToFetch());
    return that.imageCollector.fetchImages(() => that.updateProgressBarOneStep())
        .then(function() {
            main.getPackEpubButton().disabled = false;
            that.getFetchContentButton().disabled = false;
        }).catch(function (err) {
            util.logError(err);
        });
}

BakaTsukiParser.prototype.updateProgressBarOneStep = function() {
    this.updateLoadState();
}

/*
   Show progress,
   finished  true if have loaded all images, false if only loaded a single image
*/
BakaTsukiParser.prototype.updateLoadState = function() {
    let that = this;
    that.getProgressBar().value += 1;
}


BakaTsukiParser.prototype.getFetchContentButton = function() {
    return document.getElementById("fetchImagesButton");
}
