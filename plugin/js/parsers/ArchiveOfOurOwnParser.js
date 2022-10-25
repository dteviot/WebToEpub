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
        return dom.querySelector("div#chapters");
    };

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.heading")
    };

    extractAuthor(dom) {
        let author = dom.querySelector("h3.byline.heading a[rel='author']")
            ?.innerText
        return author ?? super.extractAuthor(dom);
    };

    extractLanguage(dom) {
        return dom.querySelector("meta[name='language']").getAttribute("content");
    };

    removeUnwantedElementsFromContentElement(element) {
        this.tagAuthorNotes(element.querySelectorAll(".notes"));
        if (this.userPreferences.removeAuthorNotes.value) {
            let notes = [...element.querySelectorAll(".chapter.preface.group")];
            let title = element.querySelector("h3.title");
            notes[0].replaceWith(title);
            util.removeElements(notes.slice(1));
        }

        util.removeChildElementsMatchingCss(element, "h3.landmark.heading");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("dl.meta, div.summary, .notes.module")];
    }
}
