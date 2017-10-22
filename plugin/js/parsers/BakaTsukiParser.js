/*
  Parses files on www.baka-tsuki.org
*/
"use strict";

parserFactory.register("www.baka-tsuki.org", function() { 
    return new BakaTsukiParser(new BakaTsukiImageCollector()) 
});

parserFactory.registerManualSelect(
    "Baka-Tsuki", 
    function() { return new BakaTsukiParser(new BakaTsukiImageCollector()) }
);

class BakaTsukiImageCollector extends ImageCollector {
    constructor() {
        super();
        this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
    }

    onUserPreferencesUpdate(userPreferences) {
        super.onUserPreferencesUpdate(userPreferences);
        if (userPreferences.higestResolutionImages.value) {
            this.selectImageUrlFromImagePage = this.getHighestResImageUrlFromImagePage;
        } else {
            this.selectImageUrlFromImagePage = this.getReducedResImageUrlFromImagePage
        };
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
        let nodesInItem = [];
        for(let i = 0; i < content.childNodes.length; ++i) {
            let node = util.wrapRawTextNode(content.childNodes[i]);
            if (BakaTsukiParser.isChapterStart(node)) {
                BakaTsukiParser.appendToEpubItems(epubItems, nodesInItem, sourceUrl);
                nodesInItem = [];
            };
            nodesInItem.push(node);
        };
        BakaTsukiParser.appendToEpubItems(epubItems, nodesInItem, sourceUrl);
        return epubItems;
    }

    static isChapterStart(node) {
        return util.isHeaderTag(node);
    }

    static appendToEpubItems(epubItems, nodesInItem, sourceUrl) {
        BakaTsukiParser.removeTrailingWhiteSpace(nodesInItem);
        if (0 < nodesInItem.length) {
            let epubItem = new EpubItem(sourceUrl);
            epubItem.nodes = nodesInItem;
            epubItems.push(epubItem);
        };
    }

    static removeTrailingWhiteSpace(nodesInItem) {
        let i = nodesInItem.length - 1;
        while ((0 <= i) && util.isElementWhiteSpace(nodesInItem[i])) {
            nodesInItem.pop();
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

    extractTitle(dom) {
        return dom.querySelector("h1.firstHeading").textContent.trim();
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSeriesInfo(dom, metaInfo) {
        // assumes <title> element text is "<series name>:Volume <series index> - Baka Tsuki"
        let that = this;
        let title = dom.title.trim();
        let splitIndex = title.indexOf(":");
        if (0 < splitIndex) {
            metaInfo.seriesName = title.substring(0, splitIndex);
            metaInfo.seriesIndex = that.extractVolumeIndex(title.substring(splitIndex));
        };
    }

    extractVolumeIndex(volumeString) {
        let volumeIndex = "";
        for(let ch of volumeString) {
            if (("0" <= ch) && (ch <= "9")) {
                volumeIndex += ch;
            };
        };    
        return volumeIndex;
    }

    findContent(dom) {
        return dom.querySelector("div.mw-content-ltr");
    }

    onLoadFirstPage(url, firstPageDom) {
        let that = this;
        that.firstPageDom = firstPageDom;
        this.state.chapterListUrl = url;

        let content = that.findContent(that.firstPageDom).cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        that.imageCollector.findImagesUsedInDocument(content);
        that.populateImageTable();
    }

    populateUI(dom) {  // eslint-disable-line no-unused-vars
        document.getElementById("higestResolutionImagesRow").hidden = false; 
        document.getElementById("unSuperScriptAlternateTranslations").hidden = false; 
        document.getElementById("imageSection").hidden = false;
        document.getElementById("outputSection").hidden = true;
        document.getElementById("translatorRow").hidden = false;
        document.getElementById("fileAuthorAsRow").hidden = false;
        this.getFetchContentButton().onclick = this.onFetchImagesClicked.bind(this);
        document.getElementById("coverFromUrlCheckboxInput").onclick = this.populateImageTable.bind(this);
    }

    epubItemSupplier() {
        let that = this;
        let content = that.findContent(that.firstPageDom).cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        util.fixBlockTagsNestedInInlineTags(content);
        that.replaceImageTags(content);
        util.removeUnusedHeadingLevels(content);
        if (that.userPreferences.unSuperScriptAlternateTranslations.value) {
            BakaTsukiParser.unSuperScriptAlternateTranslations(content);
        }
        util.prepForConvertToXhtml(content);
        util.removeEmptyDivElements(content);
        let epubItems = that.splitContentIntoSections(content, that.firstPageDom.baseURI);
        that.fixupInternalHyperLinks(epubItems);
        return new EpubItemSupplier(that, epubItems, that.imageCollector);
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        util.removeScriptableElements(element);

        // discard table of contents (will generate one from tags later)
        util.removeElements(element.querySelectorAll("div#toc"));

        // remove "Jump Up" text that appears beside the up arrow from translator notes
        util.removeElements(element.querySelectorAll("span.cite-accessibility-label"));

        util.removeUnneededIds(element);

        util.removeComments(element);
        that.removeUnwantedTable(element);

        // hyperlinks that allow editing text
        util.removeElements(element.querySelectorAll("span.mw-editsection"));
    }

    // There's a table at end of content, with links to other stories on Baka Tsuki.
    // It's not wanted in the EPUB
    removeUnwantedTable(element) {
        // sometimes the target table has other tables nested in it.
        let that = this;
        let tables = [...element.querySelectorAll("table")];
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
                endTable.remove();
            };
        }
    }

    isTableContainsHyperLinks(tableElement) {
        return tableElement.querySelector("a") !== null;
    }

    replaceImageTags(element) {
        let that = this;
        that.stripGalleryBox(element);
        that.imageCollector.replaceImageTags(element);
    }

    // remove gallery text and move images out of the gallery box so images can take full screen.
    stripGalleryBox(element) {

        let galleryBoxes = [...element.querySelectorAll("li.gallerybox")];
        if (0 < galleryBoxes.length) {
            BakaTsukiParser.removeTextBeforeGallery(galleryBoxes[0].parentNode);        
        }

        // move images out of the <ul> gallery
        let garbage = new Set();
        for(let listItem of galleryBoxes) {
            util.removeElements(listItem.querySelectorAll("div.gallerytext"));

            let gallery = listItem.parentNode;
            garbage.add(gallery);
            gallery.parentNode.insertBefore(listItem.firstChild, gallery);
        }

        // throw away rest of gallery  (note sometimes there are multiple galleries)
        for(let node of garbage) {
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

    splitContentIntoSections(content, sourceUrl) {
        let that = this;
        that.flattenContent(content);
        let epubItems = BakaTsukiParser.splitContentOnHeadingTags(content, sourceUrl);
        epubItems = that.consolidateEpubItems(epubItems);
        epubItems = that.discardEpubItemsWithNoVisibleContent(epubItems);
        BakaTsukiParser.indexEpubItems(epubItems, 0);
        return epubItems;
    }

    flattenContent(content) {
        // most pages have all header tags as immediate children of the content element
        // where this is not the case, flatten them so that they are.
        let that = this;
        for(let i = 0; i < content.childNodes.length; ++i) {
            let node = content.childNodes[i];
            if (that.nodeNeedsToBeFlattened(node)) {
                for(let j = node.childNodes.length - 1; 0 <= j; --j) {
                    that.insertAfter(node, node.childNodes[j]);
                }
                node.remove();
                --i;
            }
        }
    }

    nodeNeedsToBeFlattened(node) {
        let that = this;
        let numHeaders = that.numberOfHeaderTags(node);
        return ((1 < numHeaders) || ((numHeaders === 1) && !BakaTsukiParser.isChapterStart(node)));
    }

    numberOfHeaderTags(node) {
        let walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT); 
        let count = 0;
        do {
            if (BakaTsukiParser.isChapterStart(walker.currentNode)) {
                ++count;
            };
        } while (walker.nextNode());
        return count;
    }

    insertAfter(atNode, nodeToInsert) {
        let nextSibling = atNode.nextSibling;
        if (nextSibling != null) {
            atNode.parentNode.insertBefore(nodeToInsert, nextSibling);
        } else {
            atNode.parentNode.appendChild(nodeToInsert);
        }
    }

    // If a epubItem only holds a heading element, combine with following epubItem.
    // e.g. We're dealing with <h1> followed by <h2>
    consolidateEpubItems(epubItems) {
        let newEpubItems = [ epubItems[epubItems.length - 1] ];
        let i = epubItems.length - 2;
        while (0 <= i) {
            let epubItem = epubItems[i];
            if (epubItem.nodes.length === 1) {
                newEpubItems[0].nodes.unshift(epubItem.nodes[0]);
            } else {
                newEpubItems.unshift(epubItem);
            }
            --i;
        }
        return newEpubItems;
    }

    discardEpubItemsWithNoVisibleContent(epubItems) {
        let that = this;
        return epubItems.filter(item => that.hasVisibleContent(item.nodes));
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

    fixupInternalHyperLinks(epubItems) {
        let targets = this.findLinkTargets(epubItems);
        this.findAndFixHyperLinks(epubItems, targets);
    }

    findLinkTargets(epubItems) {
        let that = this;
        let targets = new Map();
        that.walkEpubItemsWithElements(
            epubItems, 
            targets,
            that.recordTarget
        );
        return targets;
    }

    findAndFixHyperLinks(epubItems, targets) {
        let that = this;
        that.walkEpubItemsWithElements(
            epubItems, 
            targets,
            that.fixHyperlink
        );
    }

    walkEpubItemsWithElements(epubItems, targets, processFoundNode) {
        let that = this;
        for(let epubItem of epubItems) {
            for(let element of epubItem.nodes.filter(e => e.nodeType === Node.ELEMENT_NODE)) {
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

    static unSuperScriptAlternateTranslations(element) {
        for(let s of util.getElements(element, "span", s => BakaTsukiParser.isPsudoSuperScriptSpan(s))) {
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

    recordTarget(node, targets, zipHref) {
        if (node.id != "") {
            targets.set(node.id, zipHref);
        };
    }

    fixHyperlink(node, targets, unused) { // eslint-disable-line no-unused-vars
        if (node.tagName === "A") {
            let targetId = util.extractHashFromUri(node.href);
            let targetZipHref = targets.get(targetId);
            if (targetZipHref != null) {
                node.href = targetZipHref + "#" + targetId;
            }
        }
    }

    onFetchImagesClicked() {
        let that = this;
        if (0 == that.imageCollector.imageInfoList.length) {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("noImagesFound"));
        } else {
            that.getFetchContentButton().disabled = true;
            that.fetchContent();
        }
    }

    fetchContent() {
        let that = this;
        that.rebuildImagesToFetch();
        this.setUiToShowLoadingProgress(that.imageCollector.numberOfImagesToFetch());
        return that.imageCollector.fetchImages(() => that.updateProgressBarOneStep())
            .then(function() {
                main.getPackEpubButton().disabled = false;
                that.getFetchContentButton().disabled = false;
            }).catch(function (err) {
                ErrorLog.log(err);
            });
    }

    updateProgressBarOneStep() {
        ProgressBar.updateValue(1);
    }

    getFetchContentButton() {
        return document.getElementById("fetchImagesButton");
    }
}
