/*
  Parses files on archiveofourown.net
*/
"use strict";

parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser() });

class ArchiveOfOurOwnParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let isSeries = dom.baseURI.includes("/series/");
        if (isSeries) {
            let chapters = [];
            let urlsOfTocPages = [...dom.querySelectorAll("dd.chapters a")]
                .map(this.linkToTocUrl);
            for(let url of urlsOfTocPages) {
                let partialList = await ArchiveOfOurOwnParser.fetchChapterUrls(url);
                chapterUrlsUI.showTocProgress(partialList);
                chapters = chapters.concat(partialList);
            }
            return chapters;
        }
    
        let baseUrl = this.getBaseUrl(dom);
        let chaptersElement = dom.querySelector("li.chapter");
        if (chaptersElement === null) {
            return this.singleChapterStory(baseUrl, dom);
        } else {
            let chaptersUrl = dom.querySelector("ul#chapter_index a");
            return ArchiveOfOurOwnParser.fetchChapterUrls(chaptersUrl);
        }
    };

    static async fetchChapterUrls(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        return [...dom.querySelectorAll("ol.chapter a")].map(
            url => ({
                sourceUrl: url.href + "?view_adult=true",
                title: url.textContent
            })
        );
    }

    linkToTocUrl(link) {
        let index = link.href.indexOf("/chapters/");
        return link.href.substring(0, index) + "/navigate";
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div.userstuff, div[class^='storytext']");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h2.heading")
    };

    extractAuthor(dom) {
        let author = dom.querySelector("h3.byline.heading");
        if (author === null) {
            author = dom.querySelector("a[rel='author']");
        }
        return author === null ? super.extractAuthor(dom) : author.innerText;
    };

    extractLanguage(dom) {
        return dom.querySelector("meta[name='language']").getAttribute("content");
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "h3.landmark.heading");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3.title");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("dl.meta, div.summary")];
    }
}
