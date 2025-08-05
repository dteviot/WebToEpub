"use strict";

parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser(); });

class ArchiveOfOurOwnParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let isSeries = dom.baseURI.includes("/series/");
        if (isSeries) {
            let chapters = [];
            let works = [...dom.querySelectorAll("ul.series.work > li")];
            for (let work of works) {
                let partialList = await this.processWorkElement(work);
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
            return this.fetchChapterUrls(chaptersUrl);
        }
    }

    async processWorkElement(work) {
        let chaptersLink = work.querySelector("dd.chapters a");
        return chaptersLink === null 
            ? this.processSingleChapterWork(work)
            : this.processMultiChapterWork(chaptersLink);
    }

    async processSingleChapterWork(work) {
        let link = work.querySelector("h4.heading a");
        return [this.linkToTocEntry(link)];
    }

    async processMultiChapterWork(chaptersLink) {
        let url = this.linkToTocUrl(chaptersLink);
        return this.fetchChapterUrls(url);
    }

    async fetchChapterUrls(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        return [...dom.querySelectorAll("ol.chapter a")]
            .map(link => this.linkToTocEntry(link));
    }

    linkToTocEntry(link) {
        return ({
            sourceUrl: this.setViewAdultFlag(link.href),
            title: link.textContent
        });
    }

    setViewAdultFlag(url) {
        url = new URL(url);
        url.searchParams.set("view_adult", "true");
        return url.href;
    }

    linkToTocUrl(link) {
        let index = link.href.indexOf("/chapters/");
        return link.href.substring(0, index) + "/navigate";
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div#chapters");
    }

    populateUIImpl() {
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.heading");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("a[rel='author']")?.innerText;
        return author ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("meta[name='language']").getAttribute("content");
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll(".meta .tags a")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.summary blockquote")?.textContent.trim();
    }

    findChapterTitle(dom) {
        let contentHasTitle = dom.querySelector("h3.title");
        return contentHasTitle
            ? null
            : dom.querySelector("h2.heading");
    }

    removeUnwantedElementsFromContentElement(element) {
        this.tagAuthorNotes(element.querySelectorAll(".notes"));
        if (this.userPreferences.removeAuthorNotes.value) {
            let notes = [...element.querySelectorAll(".chapter.preface.group")];
            let title = element.querySelector("h3.title");
            notes[0].replaceWith(title);
            util.removeElements(notes.slice(1));
        }

        util.removeChildElementsMatchingSelector(element, "h3.landmark.heading");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("dl.meta, div.summary, .notes.module")];
    }
}
