"use strict";

parserFactory.register("comrademao.com", function() { return new ComrademaoParser() });

class ComrademaoParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false; 
    }
  
    customRawDomToContentStep(chapter, content) {
        for(let s of content.querySelectorAll("div.collapse")) {
            if (this.userPreferences.removeOriginal.value) {
                s.remove();
            } else {
                let p = s.querySelector("p");
                s.replaceWith(p);
            }
        } 
    }

    getChapterUrls(dom) {
        let chapters = ComrademaoParser.extractPartialChapterList(dom);
        let pagesWithToc = ComrademaoParser.listUrlsHoldingChapterLists(dom);
        ProgressBar.setValue(0);
        ProgressBar.setMax(pagesWithToc.length);
        var sequence = Promise.resolve();
        for(let tocUrl of pagesWithToc) {
            sequence = sequence.then(function () {
                return ComrademaoParser.fetchPartialChapterList(tocUrl).then(
                    c => (chapters = chapters.concat(c))
                );
            }); 
        }
        return sequence.then(() => Promise.resolve(chapters.reverse()));
    };

    static listUrlsHoldingChapterLists(dom) {
        let urls = [];
        let nav = dom.querySelector("div.content nav");
        if (nav != null) {
            let links = [...nav.querySelectorAll("a.page-numbers:not(.next)")];
            let max = (0 < links.length) 
                ? parseInt(links[links.length - 1].textContent)
                : 0;
            for(let i = 2; i <= max; ++i) {
                let url = `${dom.baseURI}page/${i}/`;
                urls.push(url);
            }
        }
        return urls;
    }

    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            ProgressBar.updateValue(1);
            return ComrademaoParser.extractPartialChapterList(xhr.responseXML);
        });
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("table.table");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.page-title-product_2 div.wrap-content h4");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    removeUnwantedElementsFromContentElement(element) {
        for(let button of element.querySelectorAll("button")) {
            button.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        let text = this.makeChapterTitleTextFromUrl(dom.baseURI)
        let title = dom.createElement("h1");
        title.appendChild(dom.createTextNode(text));
        return title;
    }

    makeChapterTitleTextFromUrl(url) {
        let leaf = url
            .split("/")
            .filter(s => !util.isNullOrEmpty(s))
            .reverse()[0];
        let words = leaf
            .split("-")
            .map(this.capitalizeWord)
            .join(" ");
        return words;
    }

    capitalizeWord(word) {
        return word.toUpperCase()[0] + word.substring(1);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.page-title-product_2");
    }

    getInformationEpubItemChildNodes(dom) {
        let infoNodes = [...dom.querySelectorAll("div.page-title-product_2 div.wrap-content, div.info-single-product")];
        for(let e of infoNodes) {
            for(let i of e.querySelectorAll("img")) {
                i.remove();
            }
        }
        return infoNodes;
    }
}
