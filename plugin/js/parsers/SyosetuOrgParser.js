"use strict";

parserFactory.register("syosetu.org", () => new SyosetuOrgParser());
parserFactory.register("h.syosetu.org", () => new HSyosetuOrgParser());

class SyosetuOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = this.getBaseUrl(dom);
        let menu = dom.querySelector("div.ss table");
        //Handle oneshot page
        if (menu.querySelector("caption")) { 
            return this.singleChapterStory(baseUrl, dom);
        }
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        if (dom.querySelector("div.ss .novelmokuzi")) { 
            return dom.querySelector("div.ss");
        }
        //Handle oneshot page
        return dom.querySelector("div.ss:nth-child(2)");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("div.ss [itemprop='name']");
        //Handle oneshot page
        if (title == null) { 
            title = dom.querySelector("div.ss p span a");
        }
        return title;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.ss div [itemprop='author']");
        //Handle oneshot page
        if (authorLabel?.textContent == null) { 
            authorLabel = dom.querySelector("div.ss p a:nth-child(2)");
        }
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll("div.ss [itemprop='genre'] a")];
        let unavailableTags = [...dom.querySelectorAll("div.ss a.alert_color")];
        let tags = [...dom.querySelectorAll("div [itemprop='keywords'] a")];
        return [...genres, ...unavailableTags, ...tags].map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        if (dom.querySelector("div.ss div [itemprop='author']") != null) {
            return dom.querySelector("div.ss:nth-child(2)").textContent.trim();
        }

        //Handle oneshot page
        let container = dom.querySelector("div.ss:nth-child(2)");
        let desc = [];

        for (let node of container.childNodes) {
            if (node.textContent.trim() === "1 / 1") break;

            desc.push(node.textContent);
        }

        return desc.join("\n").trim();        
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
        if (dom.querySelector("div.ss div [itemprop='author']")  != null) { 
            return [...dom.querySelectorAll("div.ss:nth-child(1), div.ss:nth-child(2)")];
        }
        //Handle oneshot page
        return [...dom.querySelectorAll("div.ss:nth-child(1)")];
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