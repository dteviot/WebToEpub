/*
  Parses files on fanfiction.mugglenet.com
*/
"use strict";

parserFactory.register("fanfiction.mugglenet.com", function() { return new MuggleNetParser() });

class MuggleNetParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let baseUrl = that.getBaseUrl(dom);
        let chaptersElement = util.getElement(dom, "select", e => (e.getAttribute("name") === "chapter") );
        if (chaptersElement === null) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(util.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
        }
    }

    optionToChapterInfo(baseUrl, optionElement) {
        // constructing the URL is a bit complicated as the value is not final part of URL.
        let chapterId = optionElement.getAttribute("value");
        let searchString = "chapter=";
        let index = baseUrl.indexOf(searchString) + searchString.length;
        let url = baseUrl.slice(0, index) + chapterId;
        return {
            sourceUrl:  url,
            title: optionElement.innerText
        };
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", e => (e.id === "story") );
    }

    extractTextFromPageTitle(dom, index) {
        let text = "<unknown>";
        let profile = util.getElement(dom, "div", e => (e.id === "pagetitle") );
        if (profile !== null) {
            let links = util.getElements(profile, "a");
            if (index < links.length) {
                text = links[index].innerText.trim();
            }
        }
        return text;
    }

    extractTitle(dom) {
        return this.extractTextFromPageTitle(dom, 0);
    }

    extractAuthor(dom) {
        return this.extractTextFromPageTitle(dom, 1);
    }
}
