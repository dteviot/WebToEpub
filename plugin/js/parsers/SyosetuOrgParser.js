"use strict";

parserFactory.register("syosetu.org", () => new SyosetuOrgParser());
parserFactory.register("h.syosetu.org", () => new HSyosetuOrgParser());

class SyosetuOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom,) {
        let menu = dom.querySelector("div.ss table");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.ss");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.ss [itemprop='name']");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.ss div [itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("div.ss [itemprop='genre'] a")];
        let unavailableTags = [...dom.querySelectorAll("div.ss a.alert_color")];
        let tags = [...dom.querySelectorAll("div [itemprop='keywords'] a")];
        return [...genres, ...unavailableTags, ...tags].map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.ss:nth-child(2)").textContent.trim();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.ss:nth-child(1) p:nth-child(1), div.novelnavi, #maegaki_open, #atogaki_open");
        if (this.userPreferences.removeAuthorNotes.value) {
            util.removeChildElementsMatchingSelector(element, "#maegaki, #atogaki");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    populateUIImpl() {
        document.getElementById("removeAuthorNotesRow").hidden = false;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.ss span");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.ss:nth-child(1), div.ss:nth-child(2)")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "a[href='#fmenu']");
    }
}

class HSyosetuOrgParser extends SyosetuOrgParser {
    constructor() {
        super();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span.alert_color, div.ss:nth-child(1) p:nth-child(2), div.novelnavi, #maegaki_open, #atogaki_open");
        if (this.userPreferences.removeAuthorNotes.value) {
            util.removeChildElementsMatchingSelector(element, "#maegaki, #atogaki");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}