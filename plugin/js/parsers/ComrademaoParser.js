"use strict";

parserFactory.register("comrademao.com", function() { return new ComrademaoParser() });

class ComrademaoParser extends Parser{
    constructor() {
        super();
    }

    // This site can't handle more than 1 page at a time
    clampSimultanousFetchSize() {
        return 1;
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

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            ComrademaoParser.extractPartialChapterList,
            ComrademaoParser.getUrlsOfTocPages,
            chapterUrlsUI
        ).then(urls => urls.reverse());
    };

    static getUrlsOfTocPages(dom) {
        let pagination = dom.querySelector("nav.pagination");
        let tocUrls = [];
        if (pagination != null ) {
            let tocLinks = [...dom.querySelectorAll("a.page-numbers:not(.next)")]
                .map(a => a.href);
            if (0 < tocLinks.length) {
                let maxPageUrl = tocLinks[tocLinks.length - 1];
                let index = maxPageUrl.lastIndexOf("/", maxPageUrl.length - 2);
                let base = maxPageUrl.substring(0, index + 1);
                let maxPage = parseInt(maxPageUrl.substring(index + 1));
                if (1 < maxPage) {
                    for(let i = 2; i <= maxPage; ++i) {
                        tocUrls.push(`${base}${i}/`);
                    }
                }
            }
        }
        return tocUrls;
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
        util.removeChildElementsMatchingCss(element, "button, nav, div#comments");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return this.makeChapterTitleTextFromUrl(dom.baseURI)
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
        return [...dom.querySelectorAll("div.page-title-product_2 div.wrap-content, div.info-single-product")];
    }
}
