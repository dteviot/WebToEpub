/*
  Parses files on archiveofourown.net
*/
"use strict";

parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser() });

class ArchiveOfOurOwnParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let baseUrl = that.getBaseUrl(dom);
        let chaptersElement = dom.querySelector("li.chapter");
        if (chaptersElement === null) {
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            let chaptersUrl = dom.querySelector("ul#chapter_index a");
            return ArchiveOfOurOwnParser.fetchChapterUrls(chaptersUrl);
        }
    };

    static fetchChapterUrls(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            return [...xhr.responseXML.querySelectorAll("ol.chapter a")].map(
                url => ({
                    sourceUrl: url.href + "?view_adult=true",
                    title: url.textContent
                })
            );
        });
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div.userstuff, div[class^='storytext']");
    };

    extractTitle(dom) {
        return dom.querySelector("h2.title.heading").innerText.trim();
    };

    extractAuthor(dom) {
        return dom.querySelector("h3.byline.heading").innerText.trim();
    };

    extractLanguage(dom) {
        return dom.querySelector("meta[name='language']").getAttribute("content");
    };

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("dl.meta, div.summary")];
    }
}
