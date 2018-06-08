/*
  Template to use to create a new parser
*/
"use strict";

parserFactory.register("shinsori.com", function() { return new ShinsoriParser() });

class ShinsoriParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = ShinsoriParser.extractPartialChapterList(dom);
        let pagesWithToc = ShinsoriParser.listUrlsHoldingChapterLists(dom);
        if (pagesWithToc.length <= 1) {
            return Promise.resolve(chapters.reverse());
        }
        return Promise.all(
            pagesWithToc.map(volume => ShinsoriParser.fetchPartialChapterList(volume))
        ).then(function (tocFragments) {
            for (let fragment of tocFragments) {
                chapters = chapters.concat(fragment);
            }
            return Promise.resolve(chapters.reverse());
        });
    };

    static listUrlsHoldingChapterLists(dom) {
        let link = dom.querySelector("li.last-page a");
        let urls = [];
        if (link != null) {
            let href = link.href;
            let index = href.indexOf("page/");
            if (0 <= index) {
                let suffix = href.substring(index + 5);
                let prefix = href.substring(0, index + 5);
                let max = parseInt(suffix);
                for (let i = 2; i <= max; ++i) {
                    urls.push(prefix + i +"/");
                }
            }
        }
        return urls;
    }

    static fetchPartialChapterList(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return ShinsoriParser.extractPartialChapterList(xhr.responseXML);
        });
    }

    static extractPartialChapterList(dom) {
        let list = [...dom.querySelectorAll("div.mag-box-container li.post-item a[title]")];
        return list.map(l => ShinsoriParser.linkToChapter(l));
    }

    static linkToChapter(link) {
        return ({
            sourceUrl: link.href,
            title: link.getAttribute("title"),
            newArc: null                    
        });
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    };

    extractTitle(dom) {
        return dom.querySelector("h2.section-title").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextSibling.textContent;
    };

    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("div.stream-item-below-post-content, div.post-bottom-meta"));
        super.removeUnwantedElementsFromContentElement(content);
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("div.entry-header");
        if (title != null) {
            let junk = title.querySelector("h5");
            if (junk !=  null) {
                junk.remove();
            }
            return title;
        }
        return dom.querySelector("h1");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");    
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "li.post-item");
    }
}
